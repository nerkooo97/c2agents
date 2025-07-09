'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { runAgent, generateSpeechAction } from '@/lib/actions'
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

    let audioBufferSource: AudioBufferSourceNode | null = null;
    let nextStartTime = audioContext.currentTime;

    const processChunk = async (wavChunk: ArrayBuffer) => {
        try {
            const audioBuffer = await audioContext.decodeAudioData(wavChunk);
            audioBufferSource = audioContext.createBufferSource();
            audioBufferSource.buffer = audioBuffer;
            audioBufferSource.connect(audioContext.destination);
            
            const scheduleTime = nextStartTime;
            audioBufferSource.start(scheduleTime);
            nextStartTime += audioBuffer.duration;

        } catch (error) {
            console.error("Error decoding or playing audio chunk:", error);
            // Ignore small chunk decoding errors
        }
    };

    let audioQueue = Promise.resolve();
    for await (const chunk of streamToChunks(stream)) {
        // Create a proper WAV header for each chunk to make it playable
        const wavChunk = new ArrayBuffer(44 + chunk.length);
        const view = new DataView(wavChunk);
        
        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + chunk.length, true);
        writeString(view, 8, 'WAVE');
        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat
        view.setUint16(22, 1, true); // NumChannels
        view.setUint32(24, 24000, true); // SampleRate
        view.setUint32(28, 24000 * 2, true); // ByteRate
        view.setUint16(32, 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, chunk.length, true);
        new Uint8Array(wavChunk).set(chunk, 44);

        audioQueue = audioQueue.then(() => processChunk(wavChunk));
    }
    await audioQueue;
    
    setIsLoading(false);
    setStatusText('Tap to speak');

  }, [toast]);

  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

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
          throw new Error('Failed to get audio stream.');
      }
      
      playAudioStream(response.body);

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
    if (!isListening && transcript.trim() && !isLoading) {
      processRequest(transcript)
    }
  }, [isListening, transcript, isLoading, processRequest]);


  const handleToggleListening = () => {
    if (isLoading) return

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      setTranscript('')
      setStatusText('Listening...');
      recognitionRef.current?.start()
      setIsListening(true)
    }
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
