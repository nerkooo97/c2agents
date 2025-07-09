import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';

export async function GET() {
  const allTools = getAllTools();
  // Correctly access the 'name' and 'description' properties.
  const toolInfo = allTools.map(tool => ({
    name: tool.name || 'Unknown Tool',
    description: tool.description ?? '',
  }));
  return NextResponse.json(toolInfo);
}
