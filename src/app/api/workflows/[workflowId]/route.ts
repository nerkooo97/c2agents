'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { runAgent } from '@/lib/actions';

const COORDINATOR_AGENT_NAME = 'Coordinator Agent';

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;
  
  try {
    const body = await request.json();
    const { input } = body;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { planSteps: { orderBy: { stepNumber: 'asc' } } },
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

    const planString = workflow.planSteps.map((step, index) => 
        `${index + 1}. Use the '${step.agentName}' agent to perform the following task: ${step.task}`
      ).join('\n');

    const fullPrompt = `Your primary goal is: ${goal}.

You MUST follow this explicit plan to achieve the goal. Do not deviate from it.
${planString}

After executing the plan, synthesize the results from all steps into a final, coherent answer that addresses the original goal.
      `;

    const result = await runAgent(COORDINATOR_AGENT_NAME, fullPrompt);

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ response: result.response, steps: result.steps });

  } catch (e) {
    console.error(`Error in workflow API call for ${workflowId}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
