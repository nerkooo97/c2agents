
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import type { AgentDefinition, WorkflowDefinition, WorkflowFormData, PluginDefinition, PlanStep } from '@/lib/types';
import { WorkflowMetadataSchema } from '@/lib/types';
import { runWorkflow } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OnConnect, DefaultEdgeOptions } from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import WorkflowGraphEditor from '@/components/workflow-graph-editor';
import CustomAgentNode from '@/components/custom-agent-node';
import GoalNode from '@/components/goal-node';
import DelayNode from '@/components/delay-node';
import PluginNode from '@/components/plugin-node';
import { Bot, Home, PlusCircle, Trash2, Workflow, Save, FilePlus2, ChevronsUpDown, Code, Target, ArrowLeft, Timer, Plug } from 'lucide-react';
import { useNodesState, useEdgesState, addEdge, type Node, type Edge, type Connection } from 'reactflow';
import { cn } from '@/lib/utils';
import { getAgentDefinition } from '@/lib/agent-registry';

const WorkflowSaveForm = ({
  currentWorkflow,
  onSave,
  onClose,
}: {
  currentWorkflow: WorkflowDefinition | null;
  onSave: (data: WorkflowFormData) => void;
  onClose: () => void;
}) => {
  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(WorkflowMetadataSchema),
    defaultValues: {
      name: currentWorkflow?.name || '',
      description: currentWorkflow?.description || '',
      enableApiAccess: currentWorkflow?.enableApiAccess || false,
    },
  });
  
  useEffect(() => {
    form.reset({
      name: currentWorkflow?.name || '',
      description: currentWorkflow?.description || '',
      enableApiAccess: currentWorkflow?.enableApiAccess || false,
    });
  }, [currentWorkflow, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workflow Name</FormLabel>
              <FormControl><Input placeholder="e.g., Daily News Summary" {...field} /></FormControl>
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
              <FormControl><Textarea placeholder="A short summary of what this workflow does." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={form.control}
            name="enableApiAccess"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Enable API Access</FormLabel>
                   <p className="text-xs text-muted-foreground">Allow this workflow to be run via an API endpoint.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Workflow</Button>
        </div>
      </form>
    </Form>
  );
};


export default function ComposerPage() {
  const [goal, setGoal] = useState('');
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [finalResponse, setFinalResponse] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const initialNodes: Node[] = useMemo(() => [
      {
        id: 'goal_node',
        type: 'goalNode',
        position: { x: 50, y: 150 },
        data: { isExecuting: false },
        deletable: false,
        draggable: false,
      },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const nodeTypes = useMemo(() => ({ 
      customAgentNode: CustomAgentNode, 
      goalNode: GoalNode, 
      delayNode: DelayNode,
      pluginNode: PluginNode,
  }), []);

  const { toast } = useToast();

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);
  
  const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: true,
    style: {
      strokeWidth: 2,
    },
  };

  const handleNodeDataChange = useCallback((id: string, field: 'agentName' | 'delay' | 'pluginName' | 'task', value: string | number) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, [field]: value };
        }
        return node;
      })
    );
  }, [setNodes]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsDataLoading(true);
      try {
        const [agentsResponse, workflowsResponse, pluginsResponse] = await Promise.all([
            fetch('/api/agents'),
            fetch('/api/workflows'),
            fetch('/api/plugins'),
        ]);
        if (!agentsResponse.ok) throw new Error('Failed to fetch agents.');
        if (!workflowsResponse.ok) throw new Error('Failed to fetch workflows.');
        if (!pluginsResponse.ok) throw new Error('Failed to fetch plugins.');
        
        const agentsData = await agentsResponse.json();
        const workflowsData = await workflowsResponse.json();
        const pluginsData = await pluginsResponse.json();
        
        setAgents(agentsData);
        setWorkflows(workflowsData);
        setPlugins(pluginsData);

      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching initial data',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);
  
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isExecuting = node.id === executingNodeId;
        // This check avoids unnecessary re-renders
        if (node.data.isExecuting !== isExecuting) {
          return { ...node, data: { ...node.data, isExecuting } };
        }
        // These checks are for initially populating nodes with available agents/plugins
        if (node.type === 'customAgentNode' && (!node.data.availableAgents || node.data.availableAgents.length === 0)) {
            return { ...node, data: { ...node.data, availableAgents: agents } };
        }
        if (node.type === 'pluginNode' && (!node.data.availablePlugins || node.data.availablePlugins.length === 0)) {
           return { ...node, data: { ...node.data, availablePlugins: plugins } };
        }
        return node;
      })
    );
  }, [agents, plugins, setNodes, executingNodeId]);


  const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows');
        if (!response.ok) throw new Error('Failed to fetch workflows.');
        const data = await response.json();
        setWorkflows(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching workflows',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
  };

  const handleAddNode = (type: 'agent' | 'delay' | 'plugin') => {
    const newNodeId = `node_${Date.now()}`;
    const allNodes = nodes.filter(n => n.type !== 'goalNode');
    
    let newNode: Node;
    if (type === 'agent') {
        newNode = {
            id: newNodeId,
            type: 'customAgentNode',
            position: { x: 450, y: 50 + allNodes.length * 150 },
            data: { agentName: '', task: '', availableAgents: agents, onChange: handleNodeDataChange, isExecuting: false },
        };
    } else if (type === 'delay') {
        newNode = {
            id: newNodeId,
            type: 'delayNode',
            position: { x: 450, y: 50 + allNodes.length * 150 },
            data: { delay: 1000, onChange: handleNodeDataChange, isExecuting: false },
        };
    } else {
        newNode = {
            id: newNodeId,
            type: 'pluginNode',
            position: { x: 800, y: 50 + allNodes.length * 150 },
            data: { pluginName: '', availablePlugins: plugins, onChange: handleNodeDataChange, isExecuting: false },
        };
    }
    setNodes((nds) => nds.concat(newNode));
  };
  
  
  const handleRunWorkflow = async () => {
    if (eventSourceRef.current) {
        eventSourceRef.current.close();
    }
    
    if (!goal.trim()) {
        toast({ variant: 'destructive', title: 'Please define a goal for the workflow.'});
        return;
    }

    const agentNodes = nodes.filter(node => node.type === 'customAgentNode');
    if (agentNodes.length === 0) {
        toast({ variant: 'destructive', title: 'Workflow must have at least one agent step.' });
        return;
    }
    if (agentNodes.some(node => !node.data.agentName)) {
        toast({ variant: 'destructive', title: 'Please select an agent for each agent step.' });
        return;
    }

    setIsLoading(true);
    setFinalResponse(null);
    setExecutingNodeId('goal_node');

    try {
        const response = await fetch('/api/workflows/run-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, nodes, edges }),
        });

        if (!response.ok || !response.body) {
            const errorData = await response.json().catch(() => ({error: 'Failed to start workflow stream.'}));
            throw new Error(errorData.error);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n').filter(Boolean);

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.type === 'node-executing' && data.nodeId) {
                        setExecutingNodeId(data.nodeId);
                    } else if (data.type === 'node-finished') {
                        setExecutingNodeId(null); 
                    } else if (data.type === 'final-response' && data.content) {
                        setFinalResponse(data.content);
                    } else if (data.type === 'error') {
                        throw new Error(data.error);
                    }
                }
            }
        }
        
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Could not execute workflow.';
        toast({
            variant: "destructive",
            title: "An error occurred during workflow execution",
            description: errorMessage,
        });
        setFinalResponse(`Workflow failed. ${errorMessage}`);
    } finally {
        setIsLoading(false);
        setExecutingNodeId(null);
    }
  };

  const handleNewWorkflow = useCallback(() => {
    setCurrentWorkflow(null);
    setGoal('');
    setNodes(initialNodes);
    setEdges([]);
    toast({ title: 'New workflow started', description: 'The composer has been cleared.' });
  }, [initialNodes, setNodes, setEdges, toast]);

  const handleLoadWorkflow = useCallback((workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow);
    setGoal(workflow.goal || '');
    try {
        const loadedNodes = typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes;
        const loadedEdges = typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges;
        
        // Ensure nodes have the onChange handler after being loaded from JSON
        const nodesWithHandlers = loadedNodes.map((n: Node) => ({
            ...n,
            data: {
                ...n.data,
                onChange: handleNodeDataChange,
                availableAgents: agents,
                availablePlugins: plugins,
            }
        }));
        
        setNodes(nodesWithHandlers || initialNodes);
        setEdges(loadedEdges || []);
        toast({ title: `Workflow "${workflow.name}" loaded.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error loading workflow', description: 'The saved workflow data appears to be corrupted.' });
        handleNewWorkflow();
    }
  }, [setNodes, setEdges, toast, initialNodes, handleNewWorkflow, handleNodeDataChange, agents, plugins]);

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm(`Are you sure you want to delete this workflow?`)) return;

    try {
      const response = await fetch('/api/workflows/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workflowId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workflow');
      }
      toast({ title: "Workflow Deleted", description: `The workflow has been deleted.` });
      await fetchWorkflows(); 
      if (currentWorkflow?.id === workflowId) {
        handleNewWorkflow();
      }
    } catch (e) {
       toast({
        variant: "destructive",
        title: "Error deleting workflow",
        description: e instanceof Error ? e.message : 'Could not delete workflow.',
      });
    }
  };
  
  const handleOpenSaveSheet = () => {
    if (!goal.trim()) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'A workflow must have a goal.' });
        return;
    }
    const agentNodes = nodes.filter(node => node.type === 'customAgentNode');
    if (agentNodes.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'A workflow must have at least one agent step.' });
        return;
    }
    if (agentNodes.some(node => !node.data.agentName)) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'Please select an agent for each agent step.'});
        return;
    }
    setIsSaveSheetOpen(true);
  };

  const handleSaveWorkflow = async (formData: WorkflowFormData) => {
    const isUpdating = !!currentWorkflow;
    const apiEndpoint = isUpdating ? '/api/workflows/update' : '/api/workflows/create';
    
    const workflowDataPayload = {
        name: formData.name,
        description: formData.description,
        enableApiAccess: formData.enableApiAccess,
        goal,
        nodes: nodes,
        edges: edges,
    };
    
    const body = isUpdating
      ? JSON.stringify({ originalId: currentWorkflow.id, workflowData: workflowDataPayload })
      : JSON.stringify(workflowDataPayload);
    
    try {
      const response = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save workflow');
      }

      const { workflow: savedWorkflow } = await response.json();
      
      toast({ title: `Workflow ${isUpdating ? 'Updated' : 'Saved'}`, description: `"${savedWorkflow.name}" has been saved.`});
      
      // Update the current workflow in state
      if (typeof savedWorkflow.nodes === 'string') savedWorkflow.nodes = JSON.parse(savedWorkflow.nodes);
      if (typeof savedWorkflow.edges === 'string') savedWorkflow.edges = JSON.parse(savedWorkflow.edges);

      setCurrentWorkflow(savedWorkflow);
      await fetchWorkflows();

    } catch (e) {
       toast({
        variant: "destructive",
        title: "Error saving workflow",
        description: e instanceof Error ? e.message : 'Could not save workflow.',
      });
    } finally {
        setIsSaveSheetOpen(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" passHref>
             <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
             </Button>
          </Link>
          <h1 className="text-lg font-semibold md:text-xl">Composer</h1>
          {currentWorkflow && <span className="text-sm text-muted-foreground hidden md:block">/ {currentWorkflow.name}</span>}
        </div>
        
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewWorkflow}><FilePlus2 className="h-4 w-4 mr-2" /> New</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDataLoading}>
                  <ChevronsUpDown className="h-4 w-4 mr-2" />
                  {isDataLoading ? 'Loading...' : 'Load'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDataLoading && <DropdownMenuItem disabled>Loading...</DropdownMenuItem>}
                {!isDataLoading && workflows.length === 0 ? (
                  <DropdownMenuItem disabled>No saved workflows</DropdownMenuItem>
                ) : (
                  workflows.map(wf => (
                    <DropdownMenuItem key={wf.id} onSelect={() => handleLoadWorkflow(wf)} className="justify-between">
                      {wf.name}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }} className="ml-4 p-1 rounded-sm hover:bg-destructive/20">
                        <Trash2 className="h-4 w-4 text-destructive/70 "/>
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={handleOpenSaveSheet}><Save className="h-4 w-4 mr-2"/> {currentWorkflow ? 'Update' : 'Save'}</Button>
          <Button onClick={handleRunWorkflow} disabled={isLoading || isDataLoading}>
            <Workflow className="mr-2 h-4 w-4" />
            {isLoading ? 'Running...' : 'Run'}
          </Button>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-6 p-4 lg:p-6">
        <div className="lg:col-span-7 flex flex-col relative">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => handleAddNode('agent')} disabled={isDataLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Agent
                </Button>
                 <Button variant="outline" size="sm" onClick={() => handleAddNode('delay')} disabled={isDataLoading}>
                  <Timer className="mr-2 h-4 w-4" />
                  Add Delay
                </Button>
                 <Button variant="outline" size="sm" onClick={() => handleAddNode('plugin')} disabled={isDataLoading}>
                  <Plug className="mr-2 h-4 w-4" />
                  Add Plugin
                </Button>
            </div>
           <WorkflowGraphEditor 
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
            />
        </div>
        
        <div className="lg:col-span-3 flex flex-col gap-6">
            <Card>
                <CardHeader>
                  <CardTitle>Workflow Goal</CardTitle>
                  <CardDescription>Define the overall objective for the workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., Research the top 3 AI trends for 2024 and write a blog post about them."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="min-h-[100px]"
                  />
                  {currentWorkflow && currentWorkflow.enableApiAccess && (
                      <div className="mt-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="api-details" className="border rounded-md px-3">
                                <AccordionTrigger className="py-2 text-sm font-medium text-muted-foreground hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <Code className="h-4 w-4" />
                                        <span>API Details</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-2 text-xs">
                                    <div className="space-y-2 rounded-md bg-muted p-3 font-code">
                                        <p><span className="font-semibold text-green-500">POST</span> /api/workflows/{currentWorkflow.id}</p>
                                        <Separator className="bg-border/50"/>
                                        <p className="font-semibold">Body:</p>
                                        <pre><code>{JSON.stringify({ input: "<optional_goal_override>" }, null, 2)}</code></pre>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                  )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Final Response</CardTitle>
                    <CardDescription>The synthesized result from the completed workflow.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[120px]">
                    {isLoading && !finalResponse && <Skeleton className="h-20 w-full" />}
                    {finalResponse && <p className="text-sm whitespace-pre-wrap">{finalResponse}</p>}
                    {!isLoading && !finalResponse && (
                        <div className="flex items-center justify-center text-sm text-muted-foreground h-full">
                            Run a workflow to see the final response here.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
      <Sheet open={isSaveSheetOpen} onOpenChange={setIsSaveSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{currentWorkflow ? 'Update Workflow' : 'Save New Workflow'}</SheetTitle>
                <SheetDescription>
                    Give your workflow a name and description so you can reuse it later.
                </SheetDescription>
            </SheetHeader>
            <WorkflowSaveForm 
                currentWorkflow={currentWorkflow}
                onSave={handleSaveWorkflow}
                onClose={() => setIsSaveSheetOpen(false)}
            />
        </SheetContent>
      </Sheet>
    </div>
  );
}
