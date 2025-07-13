
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Message, ExecutionStep, AgentExecutionLog } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Eraser, ArrowLeft, Bot, Mic, TestTube2, ChevronsUpDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AgentExecutionGraph from '@/components/agent-execution-graph'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'


export default function AgentTestPage() {
  const params = useParams()
  const router = useRouter()
  const agentName = decodeURIComponent(Array.isArray(params.agentName) ? params.agentName[0] : (params.agentName as string));

  const [messages, setMessages] = useState<Message[]>([])
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!agentName) return;
    setIsLogsLoading(true);
    try {
        const encodedAgentName = encodeURIComponent(agentName);
        const response = await fetch(`/api/agents/${encodedAgentName}/logs`);
        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }
        const data = await response.json();
        setLogs(data);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Failed to load agent logs",
            description: error instanceof Error ? error.message : "Unknown error",
        });
    } finally {
        setIsLogsLoading(false);
    }
  }, [agentName, toast]);

  const startNewSession = useCallback(() => {
    if (!agentName) return;
    const newSessionId = crypto.randomUUID();
    localStorage.setItem(`agent-session-${agentName}`, newSessionId);
    setSessionId(newSessionId);
    setMessages([{ role: 'model', content: `Hello! I'm ready to help. Send a message to start testing the "${agentName}" agent.` }])
    setExecutionSteps([]);
    toast({
      title: "New Session Started",
      description: "The conversation history has been cleared.",
    });
  }, [agentName, toast]);

  useEffect(() => {
    if (!agentName) return;

    const loadSession = async () => {
        const storedSessionId = localStorage.getItem(`agent-session-${agentName}`);
        if (storedSessionId) {
            setSessionId(storedSessionId);
            try {
                const res = await fetch(`/api/conversations/${storedSessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages);
                    } else {
                         setMessages([{ role: 'model', content: `Welcome back! Continue your conversation with "${agentName}".` }])
                    }
                } else {
                   startNewSession();
                }
            } catch (e) {
                console.error("Failed to fetch session", e);
                startNewSession();
            }
        } else {
            startNewSession();
        }
    };

    loadSession();
    fetchLogs();
  }, [agentName, fetchLogs, startNewSession]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !agentName || !sessionId) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('')
    setIsLoading(true)
    setExecutionSteps([])
    abortControllerRef.current = new AbortController();

    try {
        const response = await fetch(`/api/agents/${encodeURIComponent(agentName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: currentInput, sessionId }),
            signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: "The server returned an unreadable error."}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        if (!response.body) {
            throw new Error('The response body is empty.');
        }

        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.type === 'chunk') {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage.role === 'model') {
                                lastMessage.content += data.content;
                            }
                            return newMessages;
                        });
                    } else if (data.type === 'tool') {
                        const { toolRequest, toolResponse } = data;
                        if (toolRequest) {
                            setExecutionSteps(prev => [...prev, { type: 'tool', title: `Tool Call: ${toolRequest.name}`, content: `Input: ${JSON.stringify(toolRequest.input)}` }]);
                        }
                        if (toolResponse) {
                            setExecutionSteps(prev => [...prev, { type: 'tool', title: `Tool Result: ${toolResponse.name}`, content: `Output: ${JSON.stringify(toolResponse.output)}` }]);
                        }
                    } else if (data.type === 'error') {
                         throw new Error(data.error);
                    } else if (data.type === 'usage') {
                        // Optionally handle usage data
                        console.log('Usage:', data.usage);
                    }
                }
            }
        }

    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        const errorMessage = e.message || "An unexpected error occurred.";
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: errorMessage,
        })
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          // If the last message is an empty model message, populate it with an error.
          if (lastMessage && lastMessage.role === 'model' && lastMessage.content === '') {
            lastMessage.content = `Sorry, an error occurred: ${errorMessage}`;
             return newMessages;
          }
          // Otherwise, add a new error message.
          return [...newMessages, { role: 'model', content: `Sorry, an error occurred: ${errorMessage}` }];
        });
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null;
      fetchLogs();
    }
  }
  
  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent';

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" passHref>
             <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
             </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border">
                <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt={agentDisplayName} />
                <AvatarFallback>{agentDisplayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h1 className="text-lg font-semibold capitalize">{agentDisplayName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><ChevronsUpDown className="mr-2 h-4 w-4" /> Test Mode</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <TestTube2 className="mr-2 h-4 w-4" /> Text Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/voice/${agentName}`)}>
                    <Mic className="mr-2 h-4 w-4" /> Voice Chat
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Button variant="outline" size="sm" onClick={startNewSession}>
            <Eraser className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 lg:p-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>Interact with the AI agent to test its responses.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      {message.role === 'model' && (
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt={agentDisplayName} />
                          <AvatarFallback>{agentDisplayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person" />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                   {isLoading && (
                     <div className="flex items-start gap-4">
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt={agentDisplayName} />
                          <AvatarFallback>{agentDisplayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                         <div className="rounded-lg p-3 max-w-[80%] bg-muted flex items-center space-x-2">
                           <Skeleton className="w-3 h-3 rounded-full" />
                           <Skeleton className="w-3 h-3 rounded-full" />
                           <Skeleton className="w-3 h-3 rounded-full" />
                         </div>
                     </div>
                   )}
                </div>
              </ScrollArea>
              <div className="relative">
                <Textarea
                  placeholder={`Ask ${agentDisplayName} to do something...`}
                  className="pr-20 min-h-[60px]"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isLoading || !agentName}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim() || !agentName}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
           <Card>
            <CardHeader>
              <CardTitle>Agent Execution Graph</CardTitle>
              <CardDescription>A visual representation of the agent&apos;s process.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                <AgentExecutionGraph steps={executionSteps} isLoading={isLoading} />
              </ScrollArea>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Agent Analytics</CardTitle>
                <CardDescription>A log of recent agent executions and performance.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[200px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Tokens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLogsLoading ? (
                                [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={3}>
                                        <Skeleton className="h-8 w-full" />
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                    {log.status}
                                                </Badge>
                                              </TooltipTrigger>
                                              {log.status === 'error' && log.errorDetails && (
                                                  <TooltipContent>
                                                      <p className="max-w-xs">{log.errorDetails}</p>
                                                  </TooltipContent>
                                              )}
                                            </Tooltip>
                                          </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">{log.totalTokens ?? 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No execution logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
