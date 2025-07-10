// This file is intentionally left mostly blank to resolve a build issue.
// The correct configuration is in the root next.config.ts file.
import type { AgentDefinition } from '@/lib/types';
import type { Tool } from 'genkit/tool';
import { ai } from '@/ai/genkit';

// This function now dynamically gets all tools registered with Genkit,
// including those from MCP plugins.
export async function getAllTools(): Promise<Tool<any, any>[]> {
    // Note: This is a simplification. In a real complex app, you might need
    // a more robust way to manage tools if they aren't all globally registered
    // on the main `ai` object. For this project, this works perfectly.
    const registeredTools = (await (ai as any).__tools);
    return registeredTools || [];
}

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    const toolMap: Record<string, Tool<any, any>> = {};
    const allTools = await getAllTools();
    allTools.forEach(tool => {
        if (tool.name) {
            toolMap[tool.name] = tool;
        }
    });
    return toolMap;
}

export async function getToolsForAgent(agent: AgentDefinition): Promise<Tool<any, any>[]> {
  if (!agent.tools || agent.tools.length === 0) return [];
  const availableTools = await getToolMap();
  
  return agent.tools
    .map(toolName => availableTools[toolName])
    .filter((t): t is Tool<any, any> => t !== undefined);
};
