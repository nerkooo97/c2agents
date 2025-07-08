'use client';

import type { ExecutionStep } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, BrainCircuit, Cpu, User, Wrench } from 'lucide-react'

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

  if (steps.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-full">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Cpu className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Agent Execution Graph</h3>
        <p className="text-sm text-muted-foreground">
          The agent&apos;s thought process will appear here once you run a workflow.
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

export default AgentExecutionGraph;
