
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const logs = await db.agentExecutionLog.findMany({
      orderBy: { timestamp: 'desc' },
    });
    return NextResponse.json(logs);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
