// This is a new file for the RAG Knowledge Base API.
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const documents = await db.knowledge.findMany();
    return NextResponse.json(documents);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
