import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';
import { z } from 'zod';

export async function GET() {
  try {
    const allTools = getAllTools();
    const toolInfo = allTools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.description ?? 'No description available.',
      inputSchema: z.ZodTypeAny.is(tool.inputSchema) ? (tool.inputSchema as z.ZodTypeAny).description : null,
      outputSchema: z.ZodTypeAny.is(tool.outputSchema) ? (tool.outputSchema as z.ZodTypeAny).description : null,
    }));
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
