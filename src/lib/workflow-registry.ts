import prisma from '@/lib/db';
import type { WorkflowDefinition } from '@/lib/types';

// Fetches all workflows from the database and maps them to the client-side type.
export async function getWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    const dbWorkflows = await prisma.workflow.findMany({
        include: {
            planSteps: {
                orderBy: {
                    stepNumber: 'asc',
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    // Map the Prisma model to the WorkflowDefinition interface used by the client
    const workflows: WorkflowDefinition[] = dbWorkflows.map(wf => ({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        goal: wf.goal,
        planSteps: wf.planSteps.map(step => ({
            id: step.id, // Use the database step ID for the React key
            agentName: step.agentName,
            task: step.task,
        }))
    }));

    return workflows;
  } catch (error) {
     console.error(`[Workflow Loader] Could not read workflows from database:`, error);
     // In case of a DB error, return an empty array to prevent the app from crashing.
     return [];
  }
}
