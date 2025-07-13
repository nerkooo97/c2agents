
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Message } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const conversation = await db.conversation.findUnique({
      where: { sessionId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    const messages: Message[] = JSON.parse(conversation.messages);

    return NextResponse.json({ messages });
    
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    console.error(`[API/conversations] Error fetching session ${sessionId}:`, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
