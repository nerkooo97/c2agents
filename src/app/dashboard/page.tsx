
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AgentDefinition, AgentFormData } from '@/lib/types';
import { AgentDefinitionSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Bot, MoreVertical, Pencil, PlusCircle, Send, TestTube2, Trash2 } from 'lucide-react';

type ToolMetadata = {
  name: string;
  description: string;
};

// AGENT FORM COMPONENT
const AgentForm = ({
  agent,
  onSave,
  onClose,
  availableTools,
}: {
  agent?: AgentDefinition;
  onSave: (data: AgentFormData) => void;
  onClose: () => void;
  availableTools: ToolMetadata[];
}) => {
  const form = useForm<AgentFormData>({
    resolver: zodResolver(AgentDefinitionSchema),
    defaultValues: agent || {
      name: '',
      description: '',
      systemPrompt: '',
      model: 'gemini-2.0-flash',
      tools: [],
      enableApiAccess: true,
      realtime: false,
    },
  });

  const onSubmit = (data: AgentFormData) => {
    onSave(data);
    form.reset();
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl><Input placeholder="e.g., Support Agent" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="A short summary of what the agent does." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt / Instructions</FormLabel>
              <FormControl><Textarea placeholder="You are a helpful assistant..." className="min-h-[120px]" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">gemini-2.0-flash</SelectItem>
                  <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tools"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Tools</FormLabel>
                <FormDescription>Select the tools this agent can use.</FormDescription>
              </div>
              {availableTools.map((tool) => (
                <FormField
                  key={tool.name}
                  control={form.control}
                  name="tools"
                  render={({ field }) => (
                    <FormItem key={tool.name} className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(tool.name)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, tool.name])
                              : field.onChange(field.value?.filter((value) => value !== tool.name));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{tool.name}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex space-x-8">
          <FormField
            control={form.control}
            name="enableApiAccess"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                <div className="space-y-0.5"><FormLabel>API Access</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="realtime"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                <div className="space-y-0.5"><FormLabel>Realtime Voice</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Agent</Button>
        </div>
      </form>
    </Form>
  );
};

// TEST AGENT DIALOG COMPONENT
const TestAgentDialog = ({ agent }: { agent: AgentDefinition }) => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResponse('');
    try {
      const apiResponse = await fetch(`/api/agents/${agent.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'API request failed');
      }
      const data = await apiResponse.json();
      setResponse(data.response);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({ variant: 'destructive', title: 'Test Failed', description: errorMessage });
      setResponse(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[625px]">
      <DialogHeader>
        <DialogTitle>Test Agent: {agent.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Enter a message to test the agent..."
            className="pr-20"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleTest())}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={handleTest}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {isLoading && <div className="flex items-center space-x-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 w-[200px]" /><p>Agent is thinking...</p></div>}
        {response && (
          <div className="rounded-md border bg-muted p-4">
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
};


// AGENT CARD COMPONENT
const AgentCard = ({ 
    agent, 
    onEdit, 
    onDelete, 
    onTest, 
    onToggleApi 
}: { 
    agent: AgentDefinition;
    onEdit: () => void;
    onTest: () => void;
    onDelete: () => void;
    onToggleApi: (name: string, enabled: boolean) => void;
}) => {
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2"/>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={onTest}><TestTube2 className="mr-2"/>Test</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2"/>Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Model</span>
            <Badge variant="secondary">{agent.model}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Tools</span>
            <Badge variant="secondary">{agent.tools.length}</Badge>
        </div>
         <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">API Access</span>
            {agent.enableApiAccess ? <Badge>Enabled</Badge> : <Badge variant="destructive">Disabled</Badge>}
        </div>
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Realtime</span>
             {agent.realtime ? <Badge>Enabled</Badge> : <Badge variant="destructive">Disabled</Badge>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex items-center w-full justify-between">
            <Label htmlFor={`api-toggle-${agent.name}`} className="text-sm font-medium">Toggle API Access</Label>
            <Switch id={`api-toggle-${agent.name}`} checked={agent.enableApiAccess} onCheckedChange={(checked) => onToggleApi(agent.name, checked)} />
        </div>
      </CardFooter>
    </Card>
  );
};

// MAIN DASHBOARD PAGE
export default function AgentsDashboardPage() {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for modals/sheets
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | undefined>(undefined);
  const [testingAgent, setTestingAgent] = useState<AgentDefinition | undefined>(undefined);
  const [deletingAgent, setDeletingAgent] = useState<AgentDefinition | undefined>(undefined);

  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [agentsResponse, toolsResponse] = await Promise.all([
          fetch('/api/agents'),
          fetch('/api/tools'),
        ]);

        if (!agentsResponse.ok) {
          const errorData = await agentsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch agents');
        }
        if (!toolsResponse.ok) {
          const errorData = await toolsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch tools');
        }

        const agentsData = await agentsResponse.json();
        const toolsData = await toolsResponse.json();

        setAgents(agentsData);
        setAvailableTools(toolsData);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Failed to load dashboard data',
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  const handleCreateNew = () => {
    setEditingAgent(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (agent: AgentDefinition) => {
    setEditingAgent(agent);
    setIsSheetOpen(true);
  };
  
  const handleTest = (agent: AgentDefinition) => {
    setTestingAgent(agent);
  };

  const handleDelete = (agent: AgentDefinition) => {
    setDeletingAgent(agent);
  }

  const confirmDelete = () => {
    if (!deletingAgent) return;
    setAgents(prev => prev.filter(a => a.name !== deletingAgent.name));
    toast({ title: "Agent Deleted", description: `Agent "${deletingAgent.name}" has been deleted.` });
    setDeletingAgent(undefined);
  }

  const handleSaveAgent = (data: AgentFormData) => {
    setAgents(prev => {
        const existing = prev.find(a => a.name === (editingAgent?.name || data.name));
        if (existing) {
            // Update existing
            return prev.map(a => a.name === existing.name ? { ...a, ...data } : a);
        } else {
            // Create new
            return [...prev, data];
        }
    });
    toast({ title: "Agent Saved", description: `Agent "${data.name}" has been saved.` });
    setIsSheetOpen(false);
    setEditingAgent(undefined);
  };

  const handleToggleApi = (name: string, enabled: boolean) => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, enableApiAccess: enabled } : a));
    toast({ title: "API Access Updated", description: `API access for "${name}" is now ${enabled ? 'enabled' : 'disabled'}.` });
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery]);

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
        <Button onClick={handleCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Agent
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Agents Overview</h2>
                <p className="text-muted-foreground">Create, manage, and test your AI agents.</p>
            </div>
            <Input 
                placeholder="Search agents..." 
                className="max-w-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
            ))}
          </div>
        ) : error ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center h-full"><div className="text-destructive">{error}</div></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgents.map(agent => (
              <AgentCard 
                key={agent.name} 
                agent={agent}
                onEdit={() => handleEdit(agent)}
                onTest={() => handleTest(agent)}
                onDelete={() => handleDelete(agent)}
                onToggleApi={handleToggleApi}
                />
            ))}
          </div>
        )}
      </main>

      {/* Sheet for Create/Edit */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</SheetTitle>
          </SheetHeader>
          <AgentForm
             agent={editingAgent} 
             onSave={handleSaveAgent} 
             onClose={() => setIsSheetOpen(false)}
             availableTools={availableTools}
            />
        </SheetContent>
      </Sheet>

      {/* Dialog for Testing */}
      <Dialog open={!!testingAgent} onOpenChange={(open) => !open && setTestingAgent(undefined)}>
        {testingAgent && <TestAgentDialog agent={testingAgent} />}
      </Dialog>

      {/* Alert Dialog for Deleting */}
       <AlertDialog open={!!deletingAgent} onOpenChange={(open) => !open && setDeletingAgent(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              "{deletingAgent?.name}" agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    