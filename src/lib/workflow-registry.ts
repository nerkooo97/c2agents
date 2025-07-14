
import db from '@/lib/db';
import type { WorkflowDefinition } from '@/lib/types';
import type { Node, Edge } from 'reactflow';

// Fetches all workflows from the database.
export async function getWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    const workflows = await db.workflow.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    // Handle inconsistent planSteps format (some might be strings, some objects)
    return workflows.map(wf => {
      let parsedNodes: Node[];
      if (typeof wf.nodes === 'string') {
        try {
          parsedNodes = JSON.parse(wf.nodes);
        } catch (e) {
          console.error(`[Workflow Loader] Failed to parse nodes for workflow ${wf.id}:`, e);
          parsedNodes = []; // Default to empty array on parsing error
        }
      } else if (Array.isArray(wf.nodes)) {
        parsedNodes = wf.nodes as Node[];
      } else {
        parsedNodes = [];
      }
      
      let parsedEdges: Edge[];
      if (typeof wf.edges === 'string') {
        try {
          parsedEdges = JSON.parse(wf.edges);
        } catch (e) {
          console.error(`[Workflow Loader] Failed to parse edges for workflow ${wf.id}:`, e);
          parsedEdges = []; // Default to empty array on parsing error
        }
      } else if (Array.isArray(wf.edges)) {
        parsedEdges = wf.edges as Edge[];
      } else {
        parsedEdges = [];
      }
      
      return {
        ...wf,
        nodes: parsedNodes,
        edges: parsedEdges,
      };
    });
  } catch (error) {
     console.error(`[Workflow Loader] Could not read workflows from database:`, error);
     // In case of a DB error, return an empty array to prevent the app from crashing.
     return [];
  }
}
