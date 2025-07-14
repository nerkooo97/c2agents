import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';
import { getAllMcpTools } from '@/lib/tools-registry';
import { z } from 'zod';

export async function GET() {
  try {
    const allTools = [
      ...getAllTools(),
      ...getAllMcpTools()
    ];
    const toolInfo = allTools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.description ?? 'No description available.',
      inputSchema: (tool.inputSchema as z.ZodTypeAny)?.description,
      outputSchema: (tool.outputSchema as z.ZodTypeAny)?.description,
      command: tool.command,
      args: tool.args,
      enabled: tool.enabled,
    }));
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
