'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mic, MicOff, Bot } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

type SpeechRecognition = typeof window.SpeechRecognition

async function* streamToChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}

export default function VoiceChatPage() {
  const params = useParams()
  const agentName = decodeURIComponent(Array.isArray(params.agentName) ? params.agentName[0] : (params.agentName as string) || '')
  
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [statusText, setStatusText] = useState('Tap to speak')
  const [isSupported, setIsSupported] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])

  const recognitionRef = useRef<InstanceType<SpeechRecognition> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast()

  useEffect(() => {
    if (agentName) {
      const agentDisplayName = agentName.replace(/-/g, ' ')
      setMessages([{ role: 'model', content: `Hello! I'm the ${agentDisplayName}. How can I help you today?` }]);
    }
  }, [agentName]);

  useEffect(() => {
    // Initialize AudioContext on first user interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        window.removeEventListener('click', initAudio);
        window.removeEventListener('touchend', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchend', initAudio);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Voice recognition is not supported in your browser. Try Chrome or Edge.',
      })
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('')
        setTranscript(currentTranscript)
    };

    recognition.onend = () => {
        setIsListening(false)
    }
    
    recognition.onerror = (event) => {
        toast({
            variant: "destructive",
            title: "Speech Recognition Error",
            description: event.error,
        })
    }

    recognitionRef.current = recognition
    return () => {
        window.removeEventListener('click', initAudio);
        window.removeEventListener('touchend', initAudio);
    };
  }, [toast])


 const playAudioStream = useCallback(async (stream: ReadableStream<Uint8Array>) => {
    if (!audioContextRef.current) {
        toast({ variant: "destructive", title: "Audio Error", description: "Audio context not initialized. Please interact with the page first." });
        return;
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    let nextStartTime = audioContext.currentTime;

    const processChunk = async (pcmChunk: ArrayBuffer) => {
        try {
            // Raw PCM data is 16-bit signed integers (Int16Array). Convert to Float32Array for Web Audio API.
            const pcmData16 = new Int16Array(pcmChunk);
            const pcmData32 = new Float32Array(pcmData16.length);
            for (let i = 0; i < pcmData16.length; i++) {
                pcmData32[i] = pcmData16[i] / 32768; // Normalize to [-1.0, 1.0]
            }

            // Create a buffer and source for this chunk
            const audioBuffer = audioContext.createBuffer(1, pcmData32.length, 24000);
            audioBuffer.copyToChannel(pcmData32, 0);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            const scheduleTime = nextStartTime;
            source.start(scheduleTime);
            nextStartTime += audioBuffer.duration;
            
        } catch (error) {
            console.error("Error decoding or playing audio chunk:", error);
            toast({
              variant: "destructive",
              title: "Audio Playback Error",
              description: error instanceof Error ? error.message : "Could not play audio chunk.",
            });
        }
    };
    
    let audioQueue = Promise.resolve();
    try {
        for await (const chunk of streamToChunks(stream)) {
            // Queue up processing to avoid race conditions with audio context
            audioQueue = audioQueue.then(() => processChunk(chunk.buffer));
        }
        await audioQueue;
    } catch (e) {
        console.error("Error processing audio stream:", e);
        toast({
            variant: "destructive",
            title: "Audio Stream Error",
            description: "Failed to read audio data from the server.",
        });
    } finally {
        setIsLoading(false);
        setStatusText('Tap to speak');
    }

  }, [toast]);

  const processRequest = useCallback(async (text: string) => {
    if (!agentName) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setTranscript('')

    try {
      setStatusText('Agent is thinking...');
      const agentResult = await runAgent(agentName, text, newMessages)

      if (agentResult.error) {
        throw new Error(agentResult.error)
      }

      const responseText = agentResult.response ?? "I didn't get a response."
      const modelMessage: Message = { role: 'model', content: responseText };
      setMessages(prev => [...prev, modelMessage]);
      
      setStatusText('Generating audio...');
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: responseText }),
      });

      if (!response.ok || !response.body) {
          const errorText = await response.text();
          throw new Error(`Failed to get audio stream: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      await playAudioStream(response.body);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred'
      const errorResponse: Message = { role: 'model', content: 'Sorry, an error occurred.' }
      setMessages(prev => [...prev, errorResponse]);
      toast({
        variant: 'destructive',
        title: 'Error processing request',
        description: errorMessage,
      })
      setIsLoading(false);
      setStatusText('Tap to speak');
    }
  }, [agentName, messages, toast, playAudioStream]);

  useEffect(() => {
    // This effect will trigger when listening stops.
    // We check if there's a final transcript and we are not already processing a request.
    if (!isListening && transcript.trim() && !isLoading) {
      processRequest(transcript)
    }
    // We only want this effect to run when `isListening` changes to false.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);


  const handleToggleListening = () => {
    if (isLoading) return

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      setTranscript('')
      setStatusText('Listening...');
      recognitionRef.current?.start()
    }
     setIsListening(prev => !prev);
  }

  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent'
  
  const lastUserTranscript = messages.filter(m => m.role === 'user').at(-1)?.content || "..."
  const lastAgentResponse = messages.filter(m => m.role === 'model').at(-1)?.content || "I'm ready to help."

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="flex h-16 items-center justify-between border-b px-6 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
             <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt={agentDisplayName} />
            <AvatarFallback>{agentDisplayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold font-headline capitalize">{agentDisplayName}</h1>
            <p className="text-xs text-muted-foreground">Real-time Voice Conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" passHref>
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4"/>
              Dashboard
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 lg:p-6">
        <Card className="w-full max-w-4xl">
           <CardHeader className="text-center">
            <CardTitle className="text-2xl">Voice Conversation</CardTitle>
            <CardDescription>Press the microphone and speak to the agent.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-8 p-10">
            <div className="flex w-full items-start justify-around">
                {/* User Section */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className={cn('h-28 w-28 border-4', isListening ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person portrait" />
                        <AvatarFallback>YOU</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <p className="font-bold text-lg">You</p>
                        <p className="text-muted-foreground text-sm h-12 w-60">
                           {isListening ? (<i>{transcript || "Listening..."}</i>) : (<i>"{lastUserTranscript}"</i>)}
                        </p>
                    </div>
                </div>

                {/* Agent Section */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className={cn('h-28 w-28 border-4', isLoading ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="futuristic robot" />
                        <AvatarFallback>{agentDisplayName?.substring(0, 3).toUpperCase()}</AvatarFallback>
                    </Avatar>
                     <div className="space-y-1">
                        <p className="font-bold text-lg capitalize">{agentDisplayName}</p>
                        <p className="text-muted-foreground text-sm h-12 w-60"><i>"{lastAgentResponse}"</i></p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-3 pt-6">
                <Button size="icon" className={cn('w-24 h-24 rounded-full transition-all', isListening && 'bg-destructive hover:bg-destructive/90 scale-110')} onClick={handleToggleListening} disabled={!isSupported}>
                    {isListening ? <MicOff className="h-10 w-10"/> : <Mic className="h-10 w-10"/>}
                </Button>
                <p className="text-muted-foreground text-sm h-5 font-medium">
                    {isListening ? statusText : (isLoading ? statusText : 'Tap to speak')}
                </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
