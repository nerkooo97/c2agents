

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { runWorkflow } from '@/lib/actions';
import type { WorkflowDefinition } from '@/lib/types';
import { getAgentDefinition } from '@/lib/agent-registry';


export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;
  
  try {
    const body = await request.json();
    const { input } = body;

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (!workflow.enableApiAccess) {
      return NextResponse.json({ error: 'API access is not enabled for this workflow' }, { status: 403 });
    }
    
    const goal = input || workflow.goal;
    const nodes = JSON.parse(workflow.nodes);
    const edges = JSON.parse(workflow.edges);


    if (!goal) {
        return NextResponse.json({ error: 'Workflow goal is not defined.' }, { status: 400 });
    }
    
    const result = await runWorkflow(goal, nodes, edges);
    const finalResponse = await result.responsePromise;

    if (finalResponse.error) {
        return NextResponse.json({ error: finalResponse.error }, { status: 500 });
    }

    return NextResponse.json({ response: finalResponse.response });

  } catch (e) {
    console.error(`Error in workflow API call for ${workflowId}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
