
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Message, ExecutionStep, AgentExecutionLog } from '@/lib/types'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Home, LineChart, Eraser } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AgentExecutionGraph from '@/components/agent-execution-graph'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function AgentTestPage() {
  const params = useParams()
  const agentName = Array.isArray(params.agentName) ? params.agentName[0] : params.agentName

  const [messages, setMessages] = useState<Message[]>([])
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    if (!agentName) return;
    setIsLogsLoading(true);
    try {
        const response = await fetch(`/api/agents/${agentName}/logs`);
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
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setMessages([{ role: 'model', content: `Hello! I'm ready to help. Send a message to start testing the "${agentName}" agent.` }])
    toast({
      title: "New Session Started",
      description: "The conversation history has been cleared.",
    });
  }, [agentName, toast]);

  useEffect(() => {
    if (agentName) {
        startNewSession();
        fetchLogs();
    }
  }, [agentName, fetchLogs, startNewSession])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !agentName || !sessionId) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage];

    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setExecutionSteps([])

    try {
      // Pass the entire message history to the agent
      const result = await runAgent(agentName, input, sessionId, newMessages)

      if (result.error) {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: result.error,
        })
        setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }])
      } else {
        setMessages(prev => [...prev, { role: 'model', content: result.response as string }])
        setExecutionSteps(result.steps as ExecutionStep[])
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Could not connect to the agent.",
      })
       setMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't connect to the agent. Please check the console and try again." }])
    } finally {
      setIsLoading(false)
      fetchLogs();
    }
  }
  
  const agentDisplayName = agentName?.replace(/-/g, ' ') ?? 'Agent';

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
            <p className="text-xs text-muted-foreground">Agent Test Environment</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={startNewSession}>
            <Eraser className="mr-2 h-4 w-4" />
            New Session
          </Button>
          <Link href="/" passHref>
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4"/>
              Dashboard
            </Button>
          </Link>
          <Avatar>
            <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
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
                   {isLoading && messages.at(-1)?.role === 'user' && (
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
