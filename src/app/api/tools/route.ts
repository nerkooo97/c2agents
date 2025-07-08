import { NextResponse } from 'next/server';
import { allTools } from '@/ai/tools';

export async function GET() {
  const toolInfo = allTools.map(tool => ({
    name: tool.name,
    description: tool.description ?? '',
  }));
  return NextResponse.json(toolInfo);
}
