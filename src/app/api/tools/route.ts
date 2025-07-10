import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import type { Tool } from 'genkit/tool';

export async function GET() {
  try {
    // We need to 'await' the proxy to get the real genkit instance
    const genkitInstance = await (ai as any);
    const allTools = (genkitInstance as any).__tools as Tool<any,any>[];
    
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
