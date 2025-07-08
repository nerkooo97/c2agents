'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message, ExecutionStep } from '@/lib/types'
import { runAgent } from '@/lib/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, BrainCircuit, Code, Cpu, FileSystem, Send, User, Wrench } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const AgentExecutionGraph = ({ steps, isLoading }: { steps: ExecutionStep[]; isLoading: boolean }) => {
  const IconMap = {
    prompt: User,
    memory: BrainCircuit,
    tool: Wrench,
    response: Bot,
  }

  if (isLoading && steps.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-full">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Cpu className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Agent Execution Graph</h3>
        <p className="text-sm text-muted-foreground">
          The agent&apos;s thought process will appear here once you send a message.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const Icon = IconMap[step.type]
        return (
          <div key={index}>
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-medium">{step.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground pl-16">
                <p className="whitespace-pre-wrap">{step.content}</p>
                {step.toolName && (
                  <div className="mt-2 rounded-md bg-muted p-3 font-code text-xs">
                    <p>
                      <strong>Tool:</strong> {step.toolName}
                    </p>
                    <p>
                      <strong>Input:</strong> {step.toolInput}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            {index < steps.length - 1 && (
              <div className="ml-5 h-6 w-px border-l border-dashed border-primary/50" />
            )}
          </div>
        )
      })}
       {isLoading && (
          <>
            <div className="ml-5 h-6 w-px border-l border-dashed border-primary/50" />
            <Skeleton className="h-24 w-full" />
          </>
        )}
    </div>
  )
}

export default function MyAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm MyAgent. How can I assist you today?" },
  ])
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setExecutionSteps([])

    try {
      const result = await runAgent(input)
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

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
             <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt="MyAgent" />
            <AvatarFallback>MA</AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold font-headline">MyAgent</h1>
        </div>
        <Avatar>
          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="person" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 lg:p-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>Interact with your AI agent.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      {message.role === 'assistant' && (
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="robot logo" alt="MyAgent" />
                          <AvatarFallback>MA</AvatarFallback>
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
                </div>
              </ScrollArea>
              <div className="relative">
                <Textarea
                  placeholder="Ask the agent to do something..."
                  className="pr-20 min-h-[60px]"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Agent Execution Graph</CardTitle>
              <CardDescription>A visual representation of the agent&apos;s process.</CardDescription>
            </CardHeader>
            <CardContent>
              <AgentExecutionGraph steps={executionSteps} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Definition</CardTitle>
              <CardDescription>The core prompt and configuration for this agent.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>
                This is a configurable AI agent with access to a variety of tools to help answer user questions and complete tasks. The agent's core prompt and toolset are defined programmatically in <code>src/lib/agent-registry.ts</code>.
              </p>
              <div className="flex items-center space-x-2">
                <Wrench className="h-4 w-4 text-accent" />
                <span className="font-medium">Enabled Tools:</span>
                <span>Calculator, Web Search</span>
              </div>
              <div className="flex items-center space-x-2">
                <BrainCircuit className="h-4 w-4 text-accent" />
                <span className="font-medium">Memory:</span>
                <span>Enabled (Short-term & Long-term)</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customization Hooks</CardTitle>
              <CardDescription>Modify the agent&apos;s behavior at key steps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="pre-process" className="flex flex-col space-y-1">
                  <span>Pre-process Memory</span>
                  <span className="font-normal text-xs text-muted-foreground">Clean or format memory before use.</span>
                </Label>
                <Switch id="pre-process" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="post-process" className="flex flex-col space-y-1">
                  <span>Post-process Output</span>
                   <span className="font-normal text-xs text-muted-foreground">Format the final response.</span>
                </Label>
                <Switch id="post-process" defaultChecked />
              </div>
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
