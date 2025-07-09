import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';

export async function GET() {
  const allTools = getAllTools();
  // Correctly access the 'name' and 'description' properties from the .info object.
  const toolInfo = allTools.map(tool => ({
    name: tool.info?.name || 'Unknown Tool',
    description: tool.info?.description ?? '',
  }));
  return NextResponse.json(toolInfo);
}
