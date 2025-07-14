

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  const agentName = decodeURIComponent(params.agentName);
  const url = new URL(request.url);
  const allAgents = url.searchParams.get('all') === 'true';

  try {
    const logs = await db.agentExecutionLog.findMany({
      where: allAgents ? undefined : { agentName },
      orderBy: { timestamp: 'desc' },
    });
    return NextResponse.json(logs);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
