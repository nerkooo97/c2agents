'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { AgentDefinition, ExecutionStep, PlanStep, WorkflowDefinition, WorkflowFormData } from '@/lib/types';
import { WorkflowMetadataSchema } from '@/lib/types';
import { runAgent } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OnConnect } from 'reactflow';
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
import AgentExecutionGraph from '@/components/agent-execution-graph';
import WorkflowGraphEditor from '@/components/workflow-graph-editor';
import CustomAgentNode from '@/components/custom-agent-node';
import GoalNode from '@/components/goal-node';
import { Bot, Home, PlusCircle, Trash2, Workflow, Save, FilePlus2, ChevronsUpDown, Code, Target } from 'lucide-react';
import { useNodesState, useEdgesState, addEdge, type Node, type Edge } from 'reactflow';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [finalResponse, setFinalResponse] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  
  const initialNodes: Node[] = useMemo(() => [
      {
        id: 'goal_node',
        type: 'goalNode',
        position: { x: 50, y: 150 },
        data: {},
        deletable: false,
        draggable: false,
      },
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const nodeTypes = useMemo(() => ({ customAgentNode: CustomAgentNode, goalNode: GoalNode }), []);

  const { toast } = useToast();

  const onConnect: OnConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const planStepsToFlow = useCallback((planSteps: PlanStep[]) => {
      const goalNode: Node = {
        id: 'goal_node',
        type: 'goalNode',
        position: { x: 50, y: 150 },
        data: {},
        deletable: false,
        draggable: false,
      };

      const agentNodes: Node[] = planSteps.map((step, index) => ({
          id: step.id,
          type: 'customAgentNode',
          position: { x: 450, y: 50 + 170 * index },
          data: { 
              agentName: step.agentName, 
              availableAgents: agents,
              onChange: handleNodeDataChange,
          },
      }));

      const newNodes: Node[] = [goalNode, ...agentNodes];

      const firstEdge: Edge[] = planSteps.length > 0 ? [{
          id: `e-goal_node-${planSteps[0].id}`,
          source: 'goal_node',
          target: planSteps[0].id,
          animated: true,
      }] : [];
      
      const restEdges: Edge[] = planSteps.slice(0, -1).map((step, index) => ({
          id: `e${step.id}-${planSteps[index+1].id}`,
          source: step.id,
          target: planSteps[index+1].id,
          animated: true,
      }));

      const newEdges: Edge[] = [...firstEdge, ...restEdges];
      
      setNodes(newNodes);
      setEdges(newEdges);
  }, [agents, setNodes, setEdges]);
  
  const flowToPlanSteps = (): Omit<PlanStep, 'task'>[] => {
    const plan: Omit<PlanStep, 'task'>[] = [];
    
    const startEdge = edges.find(edge => edge.source === 'goal_node');
    let currentNodeId = startEdge?.target;

    if (!currentNodeId) {
        return [];
    }
    
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const currentNode = nodes.find(node => node.id === currentNodeId);
        if (!currentNode || currentNode.type !== 'customAgentNode') break;

        plan.push({
            id: currentNode.id,
            agentName: currentNode.data.agentName,
        });

        const nextEdge = edges.find(edge => edge.source === currentNodeId);
        currentNodeId = nextEdge?.target;
    }
    return plan;
  };


  useEffect(() => {
    const fetchInitialData = async () => {
      setIsDataLoading(true);
      try {
        const [agentsResponse, workflowsResponse] = await Promise.all([
            fetch('/api/agents'),
            fetch('/api/workflows'),
        ]);
        if (!agentsResponse.ok) throw new Error('Failed to fetch agents.');
        if (!workflowsResponse.ok) throw new Error('Failed to fetch workflows.');
        
        const agentsData = await agentsResponse.json();
        const workflowsData = await workflowsResponse.json();
        
        setAgents(agentsData);
        setWorkflows(workflowsData);

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
  
  // Update node data when agents list is loaded
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'customAgentNode') {
          node.data = { ...node.data, availableAgents: agents };
        }
        return node;
      })
    );
  }, [agents, setNodes]);


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

  const handleAddStep = () => {
    const newNodeId = `node_${Date.now()}`;
    const agentNodes = nodes.filter(n => n.type === 'customAgentNode');
    const newNode: Node = {
      id: newNodeId,
      type: 'customAgentNode',
      position: { x: 450, y: 50 + agentNodes.length * 170 },
      data: {
        agentName: '',
        availableAgents: agents,
        onChange: handleNodeDataChange,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };
  
  const handleNodeDataChange = (id: string, field: 'agentName', value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, [field]: value };
        }
        return node;
      })
    );
  };
  
  const handleRunWorkflow = async () => {
    let planSteps = flowToPlanSteps();

    if (!goal.trim()) {
        toast({ variant: 'destructive', title: 'Please define a goal for the workflow.'});
        return;
    }
    if (planSteps.length === 0 || planSteps.some(step => !step.agentName)) {
        toast({ variant: 'destructive', title: 'Please connect at least one agent to the start node and select an agent for each step.'});
        return;
    }

    setIsLoading(true);
    setExecutionSteps([]);
    setFinalResponse(null);

    let previousStepOutput = `Initial goal: ${goal}`;
    const allSteps: ExecutionStep[] = [];

    try {
        const populatedPlanSteps: PlanStep[] = planSteps.map(step => {
            const agent = agents.find(a => a.name === step.agentName);
            if (!agent) throw new Error(`Agent definition for '${step.agentName}' not found.`);
            return { ...step, task: agent.defaultTask || '' };
        });

        if (populatedPlanSteps.some(step => !step.task.trim())) {
             toast({ variant: 'destructive', title: 'Missing Task', description: 'One or more agents in your plan are missing a "Core Task". Please edit the agent and define its task.'});
             setIsLoading(false);
             return;
        }

        for (let i = 0; i < populatedPlanSteps.length; i++) {
            const step = populatedPlanSteps[i];
            
            const currentPrompt = `Based on the overall goal and the previous step's result, perform your task.
\nOverall Goal: "${goal}"
\nPrevious Step Result: "${previousStepOutput}"
\nYour Task: "${step.task}"`;
            
            const result = await runAgent(step.agentName, currentPrompt);
            
            if (result.error) {
                throw new Error(`Error in step ${i + 1} (${step.agentName}): ${result.error}`);
            }

            previousStepOutput = result.response || 'No output from this step.';

            if (result.steps) {
                const stepSpecificExecutionSteps = result.steps.map(s => {
                    if (s.type === 'prompt') {
                        return { ...s, title: `Prompt for ${step.agentName}` };
                    }
                    if (s.type === 'response') {
                        return { ...s, title: `Response from ${step.agentName}` };
                    }
                    return s;
                })
                allSteps.push(...stepSpecificExecutionSteps);
            }
            setExecutionSteps([...allSteps]);
        }
        setFinalResponse(previousStepOutput);

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
    setGoal(workflow.goal);
    planStepsToFlow(workflow.planSteps);
    toast({ title: `Workflow "${workflow.name}" loaded.`});
  }, [planStepsToFlow, toast]);

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
    const planSteps = flowToPlanSteps();
    if (!goal.trim() || planSteps.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'A workflow must have a goal and at least one connected step.' });
        return;
    }
    setIsSaveSheetOpen(true);
  };

  const handleSaveWorkflow = async (formData: WorkflowFormData) => {
    const isUpdating = !!currentWorkflow;
    const apiEndpoint = isUpdating ? '/api/workflows/update' : '/api/workflows/create';
    const planSteps = flowToPlanSteps();

    const populatedPlanSteps: PlanStep[] = planSteps.map(step => {
        const agent = agents.find(a => a.name === step.agentName);
        return {
            ...step,
            task: agent?.defaultTask || '', 
        };
    });
    
    const workflowDataPayload = {
        name: formData.name,
        description: formData.description,
        enableApiAccess: formData.enableApiAccess,
        goal,
        planSteps: populatedPlanSteps,
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
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-lg">MyAgent</h1>
          </Link>
          <span className="text-lg text-muted-foreground">/</span>
          <h1 className="text-lg font-semibold">Composer</h1>
           {currentWorkflow && <span className="text-sm text-muted-foreground hidden md:block">/ {currentWorkflow.name}</span>}
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewWorkflow}><FilePlus2 /> New</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><ChevronsUpDown /> Load Workflow</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDataLoading && <DropdownMenuItem disabled>Loading...</DropdownMenuItem>}
                {!isDataLoading && workflows.length === 0 ? (
                  <DropdownMenuItem disabled>No saved workflows</DropdownMenuItem>
                ) : (
                  workflows.map(wf => (
                    <DropdownMenuItem key={wf.id} onSelect={() => handleLoadWorkflow(wf)} className="justify-between">
                      {wf.name}
                      <Trash2 className="h-4 w-4 ml-4 text-destructive/70 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }}/>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={handleOpenSaveSheet}><Save/> {currentWorkflow ? 'Update' : 'Save'}</Button>
          <Button onClick={handleRunWorkflow} disabled={isLoading || isDataLoading}>
            <Workflow className="mr-2 h-4 w-4" />
            {isLoading ? 'Running...' : 'Run Workflow'}
          </Button>
           <Link href="/" passHref>
            <Button variant="ghost" size="icon"><Home/></Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:p-6">
        {/* Left column for building */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Goal</CardTitle>
              <CardDescription>Define the overall objective. This goal is the input for the first agent in the execution plan.</CardDescription>
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
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Execution Plan</CardTitle>
                <CardDescription>Connect the 'Start' node to agent steps to build your workflow.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddStep} disabled={isDataLoading}>
                <PlusCircle className="mr-2" />
                Add Agent Step
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0">
               <WorkflowGraphEditor 
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                />
            </CardContent>
          </Card>
        </div>
        {/* Right column for results */}
        <div className="flex flex-col gap-6">
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
            <Card className="flex-1">
                <CardHeader>
                    <CardTitle>Execution Graph</CardTitle>
                    <CardDescription>A real-time view of the workflow execution steps.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AgentExecutionGraph steps={executionSteps} isLoading={isLoading} />
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
