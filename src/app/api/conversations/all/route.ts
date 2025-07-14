import { NextResponse } from 'next/server';
import type { Conversation } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'db.json');

async function getAllConversations(): Promise<Conversation[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.conversations || [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  // const { searchParams } = new URL(request.url);
  // const agentName = searchParams.get('agentName');
  try {
    const all: Conversation[] = await getAllConversations();
    // Privremeno ne filtriramo po agentName
    const sessions = all;
    return NextResponse.json({
      sessions: sessions.map((s: Conversation) => ({ sessionId: s.sessionId, createdAt: s.createdAt }))
    });
  } catch (e) {
    return NextResponse.json({ sessions: [] });
  }
} 