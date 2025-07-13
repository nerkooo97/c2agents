import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';
import { z } from 'zod';

export async function GET() {
  try {
    const allTools = getAllTools();
    const toolInfo = allTools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.description ?? 'No description available.',
      // The following lines were causing a crash if a schema was undefined.
      // The UI can function with just the name and description.
      inputSchema: (tool.inputSchema as z.ZodTypeAny)?.description,
      outputSchema: (tool.outputSchema as z.ZodTypeAny)?.description,
    }));
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
