'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Bot, Code, Mic, MoreVertical, Pencil, PlusCircle, TestTube2, Trash2, Workflow } from 'lucide-react';

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
    defaultValues: agent ? { ...agent, tags: agent.tags || [] } : {
      name: '',
      description: '',
      systemPrompt: '',
      model: 'gemini-1.5-pro',
      tools: [],
      tags: [],
      enableApiAccess: true,
      realtime: false,
    },
  });

  const onSubmit = (data: AgentFormData) => {
    onSave(data);
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
                  <SelectGroup>
                    <SelectLabel>Google</SelectLabel>
                    <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
                    <SelectItem value="gemini-2.0-flash">gemini-2.0-flash</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>OpenAI</SelectLabel>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                    <Input
                    placeholder="e.g., planner, writer, coder"
                    value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                    onChange={(e) => {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        field.onChange(tags);
                    }}
                    />
                </FormControl>
                <FormDescription>
                    Comma-separated tags to help other agents discover this one.
                </FormDescription>
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
                              ? field.onChange([...(field.value || []), tool.name])
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
        <div className="space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1 pt-1">
                {agent.tags && agent.tags.length > 0 ? (
                    agent.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="font-normal">{tag}</Badge>
                    ))
                ) : (
                    <span className="text-muted-foreground text-xs">No tags</span>
                )}
            </div>
        </div>
         <div className="flex items-center justify-between text-sm pt-2">
            <span className="font-medium text-muted-foreground">API Access</span>
            {agent.enableApiAccess ? <Badge>Enabled</Badge> : <Badge variant="destructive">Disabled</Badge>}
        </div>
        {agent.enableApiAccess && (
            <div className="text-sm">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="api-details" className="border-none">
                        <AccordionTrigger className="py-1 font-medium text-muted-foreground hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <span>API Details</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-0 text-xs">
                            <div className="space-y-2 rounded-md bg-muted p-3 font-code">
                                <p><span className="font-semibold text-green-500">POST</span> /api/agents/{agent.name}</p>
                                <Separator className="bg-border/50"/>
                                <p className="font-semibold">Body:</p>
                                <pre><code>{JSON.stringify({ input: "<user_prompt>", sessionId: "<optional>" }, null, 2)}</code></pre>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        )}
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Realtime</span>
             {agent.realtime ? <Badge>Enabled</Badge> : <Badge variant="destructive">Disabled</Badge>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col gap-4 items-start">
        <div className="flex items-center w-full justify-between">
            <Label htmlFor={`api-toggle-${agent.name}`} className="text-sm font-medium">Toggle API Access</Label>
            <Switch id={`api-toggle-${agent.name}`} checked={agent.enableApiAccess} onCheckedChange={(checked) => onToggleApi(agent.name, checked)} />
        </div>
        {agent.realtime && (
            <>
                <Separator className="w-full" />
                <Link href={`/voice/${agent.name}`} passHref className="w-full">
                    <Button variant="outline" className="w-full">
                        <Mic className="mr-2"/>
                        Voice Chat
                    </Button>
                </Link>
            </>
        )}
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
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | undefined>(undefined);
  const [deletingAgent, setDeletingAgent] = useState<AgentDefinition | undefined>(undefined);

  const router = useRouter();
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
    router.push(`/test/${agent.name}`);
  };

  const handleDelete = (agent: AgentDefinition) => {
    setDeletingAgent(agent);
  };

  const confirmDelete = async () => {
    if (!deletingAgent) return;

    try {
      const response = await fetch('/api/agents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deletingAgent.name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agent');
      }

      setAgents(prev => prev.filter(a => a.name !== deletingAgent.name));
      toast({ title: "Agent Deleted", description: `Agent "${deletingAgent.name}" has been deleted.` });
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Error deleting agent',
        description: errorMessage,
      });
    } finally {
        setDeletingAgent(undefined);
    }
  };

  const handleSaveAgent = async (data: AgentFormData) => {
    const isEditing = !!editingAgent;
    const originalName = editingAgent?.name;

    const apiEndpoint = isEditing ? '/api/agents/update' : '/api/agents/create';
    const body = isEditing ? JSON.stringify({ originalName: originalName, agentData: data }) : JSON.stringify(data);
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} agent`);
      }

      const { agent: savedAgent } = await response.json();

      if (isEditing) {
        setAgents(prev => prev.map(a => a.name === originalName ? { ...savedAgent } : a));
        toast({ title: "Agent Updated", description: `Agent "${data.name}" has been saved.` });
      } else {
        setAgents(prev => [...prev, savedAgent]);
        toast({ title: "Agent Created", description: `Agent "${data.name}" has been created.` });
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: `Error ${isEditing ? 'updating' : 'creating'} agent`,
        description: errorMessage,
      });
    } finally {
      setIsSheetOpen(false);
      setEditingAgent(undefined);
    }
  };


  const handleToggleApi = (name: string, enabled: boolean) => {
    const agentToUpdate = agents.find(a => a.name === name);
    if (!agentToUpdate) return;
    
    const updatedAgentData = { ...agentToUpdate, enableApiAccess: enabled };
    
    handleSaveAgent(updatedAgentData);
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
         <div className="flex items-center gap-2">
          <Link href="/composer" passHref>
            <Button variant="outline">
              <Workflow className="mr-2 h-4 w-4" /> Composer
            </Button>
          </Link>
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Agent
          </Button>
        </div>
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
