import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';

export async function GET() {
  try {
    const allTools = getAllTools(); // Use the new synchronous function
    const toolInfo = allTools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.info?.description ?? 'No description available.',
    }));
    console.log(toolInfo);
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
