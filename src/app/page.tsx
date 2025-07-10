
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import * as LucideIcons from 'lucide-react';
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type ToolMetadata = {
  name: string;
  description: string;
};

const iconNames = [
  'Bot', 'BrainCircuit', 'Rocket', 'Code', 'MessageSquare', 'PieChart', 
  'Globe', 'Search', 'Wrench', 'Lightbulb', 'Book', 'ShieldCheck', 'TestTube2', 'Mic'
] as const;
type IconName = typeof iconNames[number];

const availableColors = [
    { name: 'Blue', value: 'hsl(221.2 83.2% 53.3%)' }, // Primary
    { name: 'Green', value: 'hsl(142.1 76.2% 36.3%)' },
    { name: 'Purple', value: 'hsl(262.1 83.3% 57.8%)' },
    { name: 'Orange', value: 'hsl(24.6 95.0% 53.1%)' },
    { name: 'Pink', value: 'hsl(333.3 83.3% 57.8%)' },
    { name: 'Yellow', value: 'hsl(47.9 95.8% 53.1%)' },
];

const AgentIcon = ({ iconName, ...props }: { iconName?: string } & LucideIcons.LucideProps) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] || LucideIcons.Bot;
    return <IconComponent {...props} />;
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
    defaultValues: agent ? { 
        ...agent, 
        defaultTask: agent.defaultTask || '', 
        tags: agent.tags || [],
        constraints: agent.constraints || '',
        responseFormat: agent.responseFormat || 'text',
        icon: agent.icon || 'Bot',
        iconColor: agent.iconColor || availableColors[0].value,
    } : {
      name: '',
      description: '',
      systemPrompt: '',
      constraints: '',
      defaultTask: '',
      model: 'gemini-1.5-pro',
      responseFormat: 'text',
      tools: [],
      tags: [],
      enableApiAccess: true,
      realtime: false,
      enableMemory: false,
      icon: 'Bot',
      iconColor: availableColors[0].value,
    },
  });
  
  const isRealtimeAgent = form.watch('realtime');

  const models = useMemo(() => {
    const allModels = {
        google: [
            { id: "gemini-1.5-pro", name: "gemini-1.5-pro" },
            { id: "gemini-2.0-flash", name: "gemini-2.0-flash" },
        ],
        openai: [
            { id: "gpt-4o", name: "gpt-4o" },
            { id: "gpt-4-turbo", name: "gpt-4-turbo" },
        ],
    };
    if (isRealtimeAgent) {
        return {
             google: [
                { id: "gemini-1.5-pro", name: "gemini-1.5-pro (Voice Optimized)" },
            ],
            openai: [
                { id: "gpt-4o", name: "gpt-4o (Voice Optimized)" },
            ],
        }
    }
    return allModels;
  }, [isRealtimeAgent]);

  useEffect(() => {
    if (isRealtimeAgent && !['gpt-4o', 'gemini-1.5-pro'].includes(form.getValues('model'))) {
        form.setValue('model', 'gpt-4o');
    }
  }, [isRealtimeAgent, form]);


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
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <AgentIcon iconName={field.value} className="h-4 w-4" />
                                        <SelectValue placeholder="Select an icon" />
                                    </div>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {iconNames.map(icon => (
                                    <SelectItem key={icon} value={icon}>
                                        <div className="flex items-center gap-2">
                                            <AgentIcon iconName={icon} className="h-4 w-4" />
                                            <span>{icon}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="iconColor"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Icon Color</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-wrap gap-2 pt-2"
                            >
                                {availableColors.map(color => (
                                    <FormItem key={color.name} className="flex items-center space-x-1 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value={color.value} className="sr-only" />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer">
                                            <div
                                                className={cn(
                                                    'h-8 w-8 rounded-full border-2 border-transparent transition-all',
                                                    field.value === color.value && 'ring-2 ring-offset-2 ring-ring ring-offset-background'
                                                )}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        </FormLabel>
                                    </FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
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
          name="constraints"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Constraints</FormLabel>
              <FormControl><Textarea placeholder="e.g., - Do not use emojis.&#10;- Always reply in French." className="min-h-[80px]" {...field} /></FormControl>
              <FormDescription>Strict rules the agent must follow. Each constraint on a new line.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultTask"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent's Core Task</FormLabel>
              <FormControl><Textarea placeholder="The single, specific task this agent is designed to perform (e.g., 'Summarize the given text.'). This will be used in workflows." className="min-h-[80px]" {...field} /></FormControl>
               <FormDescription>
                    The default task this agent will perform when used in a workflow.
                </FormDescription>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Google</SelectLabel>
                    {models.google.map(model => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>OpenAI</SelectLabel>
                    {models.openai.map(model => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responseFormat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Response Format</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a response format" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Instruct the model to respond in a specific format.</FormDescription>
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
        <FormField
            control={form.control}
            name="enableMemory"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Enable Memory</FormLabel>
                    <FormDescription>Allow the agent to remember past conversations in a session.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )}
        />
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
    <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
      <div>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${agent.iconColor}1A` }}>
             <AgentIcon iconName={agent.icon} className="h-6 w-6" style={{ color: agent.iconColor }} />
          </div>
          <div className="flex-1">
            <CardTitle>{agent.name}</CardTitle>
            <CardDescription>{agent.description}</CardDescription>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><LucideIcons.MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}><LucideIcons.Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><LucideIcons.Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="secondary">{agent.model}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Response Format</span>
              <Badge variant="outline" className="capitalize">{agent.responseFormat || 'text'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tools</span>
              <Badge variant="secondary">{agent.tools.length}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1 pt-2">
              {agent.tags && agent.tags.length > 0 ? (
                agent.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="font-normal">{tag}</Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-xs">No tags defined.</p>
              )}
            </div>
          </div>
          <Separator/>
          <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`api-toggle-${agent.name}`} className="flex items-center gap-2 font-medium">
                  <LucideIcons.Code className="h-4 w-4" />
                  <span>API Access</span>
                </Label>
                <Switch id={`api-toggle-${agent.name}`} checked={agent.enableApiAccess} onCheckedChange={(checked) => onToggleApi(agent.name, checked)} />
              </div>
              {agent.enableApiAccess && (
                  <Accordion type="single" collapsible className="w-full -mt-2">
                      <AccordionItem value="api-details" className="border-none">
                          <AccordionTrigger className="py-1 text-xs justify-start gap-1 text-muted-foreground hover:no-underline">
                              <span>Show API Details</span>
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
              )}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-medium">
                  <LucideIcons.BrainCircuit className="h-4 w-4" />
                  <span>Memory</span>
                </Label>
                <Badge variant={agent.enableMemory ? 'default' : 'secondary'}>
                  {agent.enableMemory ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-medium">
                  <LucideIcons.Mic className="h-4 w-4" />
                  <span>Realtime Voice</span>
                </Label>
                <Badge variant={agent.realtime ? 'default' : 'secondary'}>
                  {agent.realtime ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
          <Button onClick={onTest}>
              <LucideIcons.TestTube2 className="mr-2 h-4 w-4" />
              Test in Playground
          </Button>
          {agent.realtime && (
              <Button variant="outline" asChild>
                  <Link href={`/voice/${agent.name}`} className="w-full">
                      <LucideIcons.Mic className="mr-2 h-4 w-4" />
                      Open Voice Chat
                  </Link>
              </Button>
          )}
      </CardFooter>
    </Card>
  );
};

function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <LucideIcons.Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <LucideIcons.Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


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
    
    handleSaveAgent(updatedAgentData as AgentFormData);
  };
  

  const filteredAgents = useMemo(() => {
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LucideIcons.Bot className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block">MyAgent</span>
            </Link>
        </div>
         <div className="flex flex-1 items-center justify-end gap-2">
            <nav className="hidden items-center gap-2 text-sm font-medium md:flex">
                <Link href="/composer" className="text-muted-foreground transition-colors hover:text-foreground">Composer</Link>
                <Link href="/tools" className="text-muted-foreground transition-colors hover:text-foreground">Tools</Link>
            </nav>
            <Button onClick={handleCreateNew}>
                <LucideIcons.PlusCircle className="mr-2 h-4 w-4" /> Create Agent
            </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="relative h-8 w-8 md:hidden">
                        <LucideIcons.Settings className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href="/composer">Composer</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/tools">Tools</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <ModeToggle />
                        <span>Toggle Theme</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
            <div className="hidden md:block">
                <ModeToggle />
            </div>
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
