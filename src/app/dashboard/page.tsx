'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AgentInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Pencil, PlusCircle, TestTube2 } from 'lucide-react';

const AgentCard = ({ agent }: { agent: AgentInfo }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle>{agent.name}</CardTitle>
          <CardDescription>{agent.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Model</span>
            <Badge variant="secondary">{agent.model}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Tools</span>
            <Badge variant="secondary">{agent.toolsCount}</Badge>
        </div>
         <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">API Access</span>
            {agent.apiAccess ? (
                <Badge>Enabled</Badge>
            ) : (
                <Badge variant="destructive">Disabled</Badge>
            )}
        </div>
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Realtime</span>
             {agent.realtime ? (
                <Badge>Enabled</Badge>
            ) : (
                <Badge variant="destructive">Disabled</Badge>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-grow gap-2">
            <Button variant="outline" size="sm" className="flex-1"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
            <Button variant="outline" size="sm" className="flex-1"><TestTube2 className="mr-2 h-4 w-4" /> Test</Button>
        </div>
        <div className="flex items-center justify-center space-x-2 rounded-md border p-2">
            <Switch id={`api-toggle-${agent.name}`} checked={agent.apiAccess} />
            <Label htmlFor={`api-toggle-${agent.name}`} className="text-sm font-medium">Toggle API</Label>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function AgentsDashboardPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }
        const data = await response.json();
        setAgents(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
        <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
              <Bot className="h-6 w-6 text-primary" />
              <h1 className="text-lg">MyAgent</h1>
            </Link>
            <span className="text-lg text-muted-foreground">/</span>
            <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Agent
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Agents Overview</h2>
            <p className="text-muted-foreground">Manage and monitor your AI agents.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : error ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center h-full">
                <div className="text-destructive">{error}</div>
            </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {agents.map(agent => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
