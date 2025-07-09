import db from '@/lib/db';
import type { WorkflowDefinition } from '@/lib/types';

// Fetches all workflows from the database.
export async function getWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    const workflows = await db.workflow.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    return workflows;
  } catch (error) {
     console.error(`[Workflow Loader] Could not read workflows from database:`, error);
     // In case of a DB error, return an empty array to prevent the app from crashing.
     return [];
  }
}
