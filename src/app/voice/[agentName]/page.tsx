
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Mic, MicOff, Settings, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';
type SpeechRecognition = typeof window.SpeechRecognition

export default function VoiceChatPage() {
  const params = useParams()
  const agentName = decodeURIComponent(Array.isArray(params.agentName) ? params.agentName[0] : (params.agentName as string) || '')
  
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [ttsModel, setTtsModel] = useState('gpt-4o');
  const [subtitle, setSubtitle] = useState("I'm ready to help.");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const recognitionRef = useRef<InstanceType<SpeechRecognition> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  
  const { toast } = useToast()
  
  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent'

  useEffect(() => {
    if (agentName) {
      setMessages([{ role: 'model', content: `Hello! I'm the ${agentDisplayName}. How can I help you today?` }]);
      setSubtitle(`Hello! I'm the ${agentDisplayName}. How can I help you today?`);
      setSessionId(crypto.randomUUID());
    }
  }, [agentName, agentDisplayName]);
  
  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    
    isPlayingRef.current = true;
    setConversationState('speaking');
    const audioDataUri = audioQueueRef.current.shift();

    if (!audioContextRef.current || !audioDataUri) {
      isPlayingRef.current = false;
      setConversationState('idle');
      return;
    }

    try {
      const response = await fetch(audioDataUri);
      const arrayBuffer = await response.arrayBuffer();
      const decodedAudio = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContextRef.current.destination);
      source.start();

      source.onended = () => {
        isPlayingRef.current = false;
        playNextInQueue();
      };
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Audio Playback Error',
        description: 'Could not decode or play audio.',
      });
      isPlayingRef.current = false;
      playNextInQueue();
    }
  }, [toast]);

  useEffect(() => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  const processRequest = useCallback(async (text: string) => {
    if (!agentName || !sessionId) return;
    
    setConversationState('processing');
    setSubtitle('Agent is thinking...');

    const userMessage: Message = { role: 'user', content: text };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setTranscript('');

    try {
      const agentResult = await runAgent(agentName, text, sessionId);
      if (agentResult.error) throw new Error(agentResult.error);
      
      const responseText = agentResult.response ?? "I didn't get a response.";
      const modelMessage: Message = { role: 'model', content: responseText };
      setMessages(prev => [...prev, modelMessage]);
      setSubtitle(responseText);
      
      const speechResponse = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: responseText, model: ttsModel }),
      });

      const result = await speechResponse.json();
      if (!speechResponse.ok) throw new Error(result.error || `Failed to get audio stream: ${speechResponse.status}`);
      
      audioQueueRef.current.push(result.audio);
      playNextInQueue();

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      const errorResponse: Message = { role: 'model', content: 'Sorry, an error occurred.' };
      setMessages(prev => [...prev, errorResponse]);
      setSubtitle('Sorry, an error occurred.');
      toast({ variant: 'destructive', title: 'Error processing request', description: errorMessage });
      setConversationState('idle');
    }
  }, [agentName, sessionId, messages, ttsModel, toast, playNextInQueue]);

  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      toast({ variant: 'destructive', title: 'Browser Not Supported', description: 'Voice recognition is not supported in your browser.' });
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setTranscript(currentTranscript);
      setSubtitle(currentTranscript || '...');
    };

    recognition.onend = () => {
      if (conversationState === 'listening') {
        setConversationState('idle');
        if (transcript.trim()) {
            processRequest(transcript);
        }
      }
    };
    
    recognition.onerror = (event) => {
      toast({ variant: "destructive", title: "Speech Recognition Error", description: event.error });
      if (conversationState === 'listening') setConversationState('idle');
    };

    recognitionRef.current = recognition;

    return () => document.removeEventListener('click', initAudio);
  }, [toast, processRequest, transcript, conversationState]);

  const handleToggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (conversationState === 'listening') {
      recognition.stop();
    } else if (conversationState === 'idle') {
      setTranscript('');
      setSubtitle('Listening...');
      recognition.start();
      setConversationState('listening');
    }
  };
  
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" passHref>
             <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
             </Button>
          </Link>
          <h1 className="text-lg font-semibold capitalize">{agentDisplayName}</h1>
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
                    <Avatar className={cn('h-28 w-28 border-4', conversationState === 'listening' ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
                        <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person portrait" />
                        <AvatarFallback>YOU</AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-lg">You</p>
                </div>
                <div className="flex flex-col items-center gap-3 text-center">
                    <Avatar className={cn('h-28 w-28 border-4', conversationState === 'processing' || conversationState === 'speaking' ? 'border-primary shadow-lg shadow-primary/50 animate-pulse' : 'border-muted')}>
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
                            <SelectItem value="gpt-4o">OpenAI - gpt-4o (Realtime)</SelectItem>
                            <SelectItem value="tts-1-hd">OpenAI - TTS-1-HD (Quality)</SelectItem>
                            <SelectItem value="gemini-2.5-flash-preview-tts">Google - Gemini TTS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button 
                    size="icon" 
                    className={cn('w-24 h-24 rounded-full transition-all', conversationState === 'listening' && 'bg-destructive hover:bg-destructive/90 scale-110')} 
                    onClick={handleToggleListening} 
                    disabled={!isSupported || ['processing', 'speaking'].includes(conversationState)}
                >
                    {conversationState === 'listening' ? <MicOff className="h-10 w-10"/> : <Mic className="h-10 w-10"/>}
                </Button>
                <p className="text-muted-foreground text-sm h-5 font-medium">
                  {conversationState === 'listening' ? 'Listening...' : (conversationState === 'processing' || conversationState === 'speaking' ? subtitle : 'Tap to speak')}
                </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
