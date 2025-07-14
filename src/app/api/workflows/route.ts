import { NextResponse } from 'next/server';
import { getWorkflows } from '@/lib/workflow-registry';

export async function GET() {
  try {
    const workflows = await getWorkflows();
    return NextResponse.json(workflows);
  } catch (e) {
    console.error('[API/Workflows] Error fetching workflows:', e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
