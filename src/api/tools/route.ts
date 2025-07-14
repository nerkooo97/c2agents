import { NextResponse } from 'next/server';
import { getToolMap } from '@/ai/tools';

export async function GET() {
  try {
    // We now fetch only the statically defined tools to avoid server crashes.
    const allTools = Object.values(getToolMap()); 
    
    const toolInfo = allTools.map(tool => ({
      name: tool.name,
      description: tool.description ?? 'No description available.',
    }));

    return NextResponse.json(toolInfo);
  } catch (error) {
    console.error("Error fetching tools:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
