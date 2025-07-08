'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Message, ExecutionStep } from '@/lib/types'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Home } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AgentExecutionGraph from '@/components/agent-execution-graph'

export default function AgentTestPage() {
  const params = useParams()
  const agentName = Array.isArray(params.agentName) ? params.agentName[0] : params.agentName

  const [messages, setMessages] = useState<Message[]>([])
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentName) {
        setMessages([{ role: 'assistant', content: `Hello! I'm ready to help. How can I assist you today? Send a message to start testing the "${agentName}" agent.` }])
    }
  }, [agentName])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !agentName) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setExecutionSteps([])

    try {
      const result = await runAgent(agentName, input)
      if (result.error) {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: result.error,
        })
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: result.response as string }])
        setExecutionSteps(result.steps as ExecutionStep[])
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Could not connect to the agent.",
      })
       setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect to the agent. Please check the console and try again." }])
    } finally {
      setIsLoading(false)
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
                      {message.role === 'assistant' && (
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt={agentDisplayName} />
                          <AvatarFallback>{agentDisplayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`rounded-lg p-3 max-w-[80%] ${message.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
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
              <AgentExecutionGraph steps={executionSteps} isLoading={isLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CLI Tooling</CardTitle>
              <CardDescription>Bootstrap your agent projects quickly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-4 font-code text-sm">
                <pre><code>npx create-myagent-app my-new-agent</code></pre>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Use the CLI to scaffold new projects with your choice of LLM provider, memory backend, and example tools.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
