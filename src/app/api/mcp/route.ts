
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const servers = await db.mcpServer.findMany();
    return NextResponse.json(servers);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
