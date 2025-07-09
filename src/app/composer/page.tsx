'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AgentDefinition, ExecutionStep, PlanStep, WorkflowDefinition, WorkflowFormData } from '@/lib/types';
import { WorkflowMetadataSchema } from '@/lib/types';
import { runAgent } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import AgentExecutionGraph from '@/components/agent-execution-graph';
import { Bot, Home, PlusCircle, Trash2, Workflow, Save, FilePlus2, ChevronsUpDown } from 'lucide-react';

const COORDINATOR_AGENT_NAME = 'Coordinator Agent';


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
    },
  });
  
  useEffect(() => {
    form.reset({
      name: currentWorkflow?.name || '',
      description: currentWorkflow?.description || '',
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
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [finalResponse, setFinalResponse] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);

  const { toast } = useToast();

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

        setAgents(agentsData.filter((a: AgentDefinition) => a.name !== COORDINATOR_AGENT_NAME));
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
    setPlanSteps([...planSteps, { id: Date.now().toString(), agentName: '', task: '' }]);
  };

  const handleRemoveStep = (id: string) => {
    setPlanSteps(planSteps.filter(step => step.id !== id));
  };

  const handleStepChange = (id: string, field: 'agentName' | 'task', value: string) => {
    setPlanSteps(
      planSteps.map(step => (step.id === id ? { ...step, [field]: value } : step))
    );
  };
  
  const handleRunWorkflow = async () => {
      if (!goal.trim()) {
          toast({ variant: 'destructive', title: 'Please define a goal for the workflow.'});
          return;
      }
      if (planSteps.some(step => !step.agentName || !step.task.trim())) {
          toast({ variant: 'destructive', title: 'Please complete all plan steps.'});
          return;
      }
      
      setIsLoading(true);
      setExecutionSteps([]);
      setFinalResponse(null);

      const planString = planSteps.map((step, index) => 
        `${index + 1}. Use the '${step.agentName}' agent to perform the following task: ${step.task}`
      ).join('\n');

      const fullPrompt = `Your primary goal is: ${goal}.

You MUST follow this explicit plan to achieve the goal. Do not deviate from it.
${planString}

After executing the plan, synthesize the results from all steps into a final, coherent answer that addresses the original goal.
      `;
      
      try {
        const result = await runAgent(COORDINATOR_AGENT_NAME, fullPrompt);

        if (result.error) {
            throw new Error(result.error);
        }
        
        setFinalResponse(result.response ?? 'The agent did not return a final response.');
        setExecutionSteps(result.steps ?? []);

      } catch (e) {
          toast({
              variant: "destructive",
              title: "An error occurred",
              description: e instanceof Error ? e.message : 'Could not execute workflow.',
          });
      } finally {
          setIsLoading(false);
      }
  };

  const handleNewWorkflow = () => {
    setCurrentWorkflow(null);
    setGoal('');
    setPlanSteps([]);
    toast({ title: 'New workflow started', description: 'The composer has been cleared.' });
  };

  const handleLoadWorkflow = (workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow);
    setGoal(workflow.goal);
    setPlanSteps(workflow.planSteps);
    toast({ title: `Workflow "${workflow.name}" loaded.`});
  };

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
      await fetchWorkflows(); // Refresh list
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
    if (!goal.trim() || planSteps.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'A workflow must have a goal and at least one step.' });
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
        goal,
        planSteps,
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
      await fetchWorkflows(); // Refresh list

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
                {workflows.length === 0 ? (
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
              <CardDescription>Define the overall objective for your multi-agent workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Research the top 3 AI trends for 2024 and write a blog post about them."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Execution Plan</CardTitle>
                <CardDescription>Add and configure the sequence of tasks for your agents.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddStep} disabled={isDataLoading}>
                <PlusCircle className="mr-2" />
                Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isDataLoading && <Skeleton className="h-24 w-full" />}
                {planSteps.length === 0 && !isDataLoading && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-full">
                        <p className="text-sm text-muted-foreground">No steps defined. Click "Add Step" to begin.</p>
                    </div>
                )}
                {planSteps.map((step, index) => (
                    <Card key={step.id} className="p-4 relative bg-card/50">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => handleRemoveStep(step.id)}>
                            <Trash2 className="text-destructive" />
                        </Button>
                        <div className="flex items-center gap-4 mb-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{index + 1}</span>
                            <h4 className="font-semibold">Plan Step</h4>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor={`agent-select-${step.id}`}>Agent</Label>
                                <Select value={step.agentName} onValueChange={(value) => handleStepChange(step.id, 'agentName', value)}>
                                    <SelectTrigger id={`agent-select-${step.id}`}>
                                        <SelectValue placeholder="Select an agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.map(agent => (
                                            <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor={`task-input-${step.id}`}>Task</Label>
                                <Textarea 
                                    id={`task-input-${step.id}`}
                                    placeholder="Describe the task for this agent..." 
                                    value={step.task}
                                    onChange={(e) => handleStepChange(step.id, 'task', e.target.value)}
                                />
                             </div>
                        </div>
                    </Card>
                ))}
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
