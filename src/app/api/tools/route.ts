import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';

export async function GET() {
  const allTools = await getAllTools();
  const toolInfo = allTools.map(tool => ({
    name: tool.name,
    description: tool.description ?? '',
  }));
  return NextResponse.json(toolInfo);
}
