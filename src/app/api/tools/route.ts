import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';

export async function GET() {
  try {
    const allTools = await getAllTools();
    const toolInfo = allTools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.info?.description ?? 'No description available.',
    }));
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
