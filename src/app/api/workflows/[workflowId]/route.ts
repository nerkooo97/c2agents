'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { runAgent } from '@/lib/actions';
import type { ExecutionStep } from '@/lib/types';


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

    if (!goal) {
        return NextResponse.json({ error: 'Workflow goal is not defined.' }, { status: 400 });
    }
    
    let previousStepOutput = `Initial goal: ${goal}`;
    const allSteps: ExecutionStep[] = [];
    
    for (const step of workflow.planSteps) {
        const currentPrompt = `Based on the overall goal and the previous step's result, perform your task.
\nOverall Goal: "${goal}"
\nPrevious Step Result: "${previousStepOutput}"
\nYour Task: "${step.task}"`;
        
        // The runAgent function now correctly lives in a server-only module.
        const result = await runAgent(step.agentName, currentPrompt);
        
        if (result.error) {
            return NextResponse.json({ error: `Error in step for agent ${step.agentName}: ${result.error}` }, { status: 500 });
        }
        
        previousStepOutput = result.response || 'No output from this step.';
        if (result.steps) {
            allSteps.push(...result.steps);
        }
    }

    return NextResponse.json({ response: previousStepOutput, steps: allSteps });

  } catch (e) {
    console.error(`Error in workflow API call for ${workflowId}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
