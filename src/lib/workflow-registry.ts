import db from '@/lib/db';
import type { WorkflowDefinition } from '@/lib/types';
import type { PlanStep } from './types';

// Fetches all workflows from the database.
export async function getWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    const workflows = await db.workflow.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    // Manually cast the JSON 'planSteps' to the correct type.
    return workflows.map(wf => ({
        ...wf,
        planSteps: JSON.parse(wf.planSteps) as PlanStep[],
    }));
  } catch (error) {
     console.error(`[Workflow Loader] Could not read workflows from database:`, error);
     // In case of a DB error, return an empty array to prevent the app from crashing.
     return [];
  }
}
