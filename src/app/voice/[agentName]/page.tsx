
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mic, MicOff, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type SpeechRecognition = typeof window.SpeechRecognition

export default function VoiceChatPage() {
  const params = useParams()
  const agentName = decodeURIComponent(Array.isArray(params.agentName) ? params.agentName[0] : (params.agentName as string) || '')
  
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [ttsModel, setTtsModel] = useState('gpt-4o-mini-tts');
  const [subtitle, setSubtitle] = useState("I'm ready to help.");

  const recognitionRef = useRef<InstanceType<SpeechRecognition> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const { toast } = useToast()
  
  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent'

  useEffect(() => {
    if (agentName) {
      setMessages([{ role: 'model', content: `Hello! I'm the ${agentDisplayName}. How can I help you today?` }]);
      setSubtitle(`Hello! I'm the ${agentDisplayName}. How can I help you today?`);
    }
  }, [agentName, agentDisplayName]);
  

  useEffect(() => {
    // Initialize AudioContext on user interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);


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
        setSubtitle(currentTranscript || '...');
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
      document.removeEventListener('click', initAudio);
    }
  }, [toast])


  const playAudio = useCallback(async (audioDataUri: string) => {
      if (!audioContextRef.current) return;
      
      try {
          const base64Audio = audioDataUri.split(',')[1];
          if (!base64Audio) throw new Error('Invalid audio data URI');
          
          const audioBuffer = Buffer.from(base64Audio, 'base64');
          const decodedAudio = await audioContextRef.current.decodeAudioData(audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength));
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = decodedAudio;
          source.connect(audioContextRef.current.destination);
          source.start();

          source.onended = () => {
              setIsLoading(false);
          };

      } catch (error) {
           toast({
              variant: 'destructive',
              title: 'Audio Playback Error',
              description: 'Could not decode or play audio.',
          });
          setIsLoading(false);
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
      setSubtitle('Agent is thinking...');
      const agentResult = await runAgent(agentName, text, newMessages)

      if (agentResult.error) {
        throw new Error(agentResult.error)
      }

      const responseText = agentResult.response ?? "I didn't get a response."
      const modelMessage: Message = { role: 'model', content: responseText };
      setMessages(prev => [...prev, modelMessage]);
      setSubtitle(responseText);
      
      setSubtitle('Generating audio...');
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: responseText, model: ttsModel }),
      });

      const result = await response.json();
      
      if (!response.ok) {
          throw new Error(result.error || `Failed to get audio stream: ${response.status}`);
      }
      
      await playAudio(result.audio);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred'
      const errorResponse: Message = { role: 'model', content: 'Sorry, an error occurred.' }
      setMessages(prev => [...prev, errorResponse]);
      setSubtitle('Sorry, an error occurred.');
      toast({
        variant: 'destructive',
        title: 'Error processing request',
        description: errorMessage,
      })
      setIsLoading(false);
    }
  }, [agentName, messages, toast, playAudio, ttsModel]);

  useEffect(() => {
    if (!isListening && transcript.trim() && !isLoading) {
      processRequest(transcript)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript, isLoading]);


  const handleToggleListening = () => {
    if (isLoading) return;

    // Ensure AudioContext is running
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      setTranscript('')
      setSubtitle('Listening...');
      recognitionRef.current?.start()
    }
     setIsListening(prev => !prev);
  }
  
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
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
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className={cn('h-28 w-28 border-4', isListening ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person portrait" />
                        <AvatarFallback>YOU</AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-lg">You</p>
                </div>
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className={cn('h-28 w-28 border-4', isLoading ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="futuristic robot" />
                        <AvatarFallback>{agentDisplayName?.substring(0, 3).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-lg capitalize">{agentDisplayName}</p>
                </div>
            </div>

            <div className="w-full pt-4">
              <div className="h-14 w-full rounded-lg bg-muted flex items-center justify-center p-4">
                <p className="text-center text-muted-foreground italic">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 pt-6 w-full max-w-xs">
                <div className="w-full space-y-2">
                    <Label htmlFor="tts-model-select" className="flex items-center gap-2 text-muted-foreground">
                        <Settings className="h-4 w-4" />
                        <span>Text-to-Speech Model</span>
                    </Label>
                    <Select value={ttsModel} onValueChange={setTtsModel}>
                        <SelectTrigger id="tts-model-select">
                            <SelectValue placeholder="Select a TTS model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gpt-4o-mini-tts">OpenAI - gpt-4o-mini-tts (Realtime)</SelectItem>
                            <SelectItem value="tts-1-hd">OpenAI - TTS-1-HD (Quality)</SelectItem>
                            <SelectItem value="gemini-2.5-flash-preview-tts">Google - Gemini TTS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button size="icon" className={cn('w-24 h-24 rounded-full transition-all', isListening && 'bg-destructive hover:bg-destructive/90 scale-110')} onClick={handleToggleListening} disabled={!isSupported}>
                    {isListening ? <MicOff className="h-10 w-10"/> : <Mic className="h-10 w-10"/>}
                </Button>
                <p className="text-muted-foreground text-sm h-5 font-medium">
                  {isListening ? 'Listening...' : (isLoading ? subtitle : 'Tap to speak')}
                </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
