'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { runAgent, generateSpeechAction } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mic, MicOff, Bot } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Message } from '@/lib/types'

type SpeechRecognition = typeof window.SpeechRecognition

export default function VoiceChatPage() {
  const params = useParams()
  const agentName = decodeURIComponent(Array.isArray(params.agentName) ? params.agentName[0] : (params.agentName as string) || '')
  
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])

  const recognitionRef = useRef<InstanceType<SpeechRecognition> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (agentName) {
      const agentDisplayName = agentName.replace(/-/g, ' ')
      setMessages([{ role: 'model', content: `Hello! I'm the ${agentDisplayName}. How can I help you today?` }]);
    }
  }, [agentName]);

  useEffect(() => {
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
  }, [toast])

  const processRequest = useCallback(async (text: string) => {
    if (!agentName) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setTranscript('')

    try {
      const agentResult = await runAgent(agentName, text, newMessages)

      if (agentResult.error) {
        throw new Error(agentResult.error)
      }

      const responseText = agentResult.response ?? "I didn't get a response."
      const modelMessage: Message = { role: 'model', content: responseText };
      setMessages(prev => [...prev, modelMessage]);
      
      const speechResult = await generateSpeechAction(responseText)
      if (speechResult.error) {
        throw new Error(speechResult.error)
      }

      if (audioRef.current && speechResult.audioUrl) {
        audioRef.current.src = speechResult.audioUrl
        audioRef.current.play()
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred'
      const errorResponse: Message = { role: 'model', content: 'Sorry, an error occurred.' }
      setMessages(prev => [...prev, errorResponse]);
      toast({
        variant: 'destructive',
        title: 'Error processing request',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [agentName, messages, toast]);

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
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent'

  let statusText = "Click the microphone to start speaking."
  if (isLoading) {
    statusText = "Thinking..."
  } else if (isListening) {
    statusText = "Listening..."
  }
  
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
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Voice Conversation</CardTitle>
            <CardDescription>Click the button and speak to the agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="w-full min-h-[8rem] rounded-lg bg-muted flex items-center justify-center p-6 text-center text-muted-foreground relative">
              <p>{statusText}</p>
              {isLoading && (
                  <div className="absolute bottom-4 flex items-center space-x-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="w-3 h-3 rounded-full" />
                  </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <h4 className="font-medium">You Said</h4>
                  </div>
                  <p className="text-muted-foreground italic h-16">{isListening ? transcript : lastUserTranscript}</p>
              </div>
              <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <Avatar className="h-6 w-6">
                      <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <h4 className="font-medium">Agent Replied</h4>
                  </div>
                  <p className="text-muted-foreground h-16">{lastAgentResponse}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full h-16 text-lg" onClick={handleToggleListening} disabled={isLoading || !isSupported} >
              {isListening ? <MicOff className="mr-2"/> : <Mic className="mr-2"/>}
              {isListening ? 'Stop Listening' : 'Start Talking'}
            </Button>
          </CardFooter>
        </Card>
        <audio ref={audioRef} className="hidden" />
      </main>
    </div>
  )
}
