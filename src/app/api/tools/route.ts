import { NextResponse } from 'next/server';
import { getAllTools } from '@/ai/tools';
import { loadTools } from '@/lib/tools-registry';
import { z } from 'zod';
import { toToolDefinition } from 'genkit/tool';

export async function GET() {
  try {
    const mcpTools = await loadTools();
    const allTools = [
      ...getAllTools(),
      ...mcpTools
    ];
    console.log(allTools);
    const toolInfo = allTools.map(tool => {
      if (typeof tool === 'function') {
        // Genkit tool: koristi toToolDefinition za ispravno dohvaćanje imena i opisa
        const def = toToolDefinition(tool);
        return {
          name: def.name || 'Unknown Tool',
          description: def.description || 'No description available.',
          inputSchema: def.inputSchema?.description,
          outputSchema: def.outputSchema?.description,
          command: tool.command,
          args: tool.args,
          enabled: tool.enabled,
        };
      }
      // MCP alat (običan objekt)
      return {
        name: tool.name || 'Unknown Tool',
        description: tool.description ?? 'No description available.',
        inputSchema: (tool.inputSchema as z.ZodTypeAny)?.description,
        outputSchema: (tool.outputSchema as z.ZodTypeAny)?.description,
        command: tool.command,
        args: tool.args,
        enabled: tool.enabled,
      };
    });
    return NextResponse.json(toolInfo);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
