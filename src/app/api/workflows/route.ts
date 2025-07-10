import { NextResponse } from 'next/server';
import { getWorkflows } from '@/lib/workflow-registry';

export async function GET() {
  try {
    const workflows = await getWorkflows();
    const transformedWorkflows = workflows.map(wf => ({
        ...wf,
        planSteps: wf.planSteps as any[]
    }));
    return NextResponse.json(transformedWorkflows);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
