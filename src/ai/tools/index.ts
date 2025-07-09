
import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';

// Explicitly import all available tools
import calculator from '@/ai/tools/calculator';
import delegateTask from '@/ai/tools/delegate-task';
import webSearch from '@/ai/tools/web-search';
// Note: playwright is currently disabled.
import playwright from '@/ai/tools/playwright';


// Create a static list of all tools.
// This approach is more robust than dynamic file-system based loading,
// especially in environments like Next.js where metadata might not be
// immediately available on dynamically imported modules.
const allTools: (Tool<any, any> | undefined)[] = [
  calculator,
  delegateTask,
  webSearch,
  playwright,
];

// This synchronous function returns the fully loaded tools.
export function getAllTools(): Tool<any, any>[] {
    return allTools.filter(Boolean) as Tool<any, any>[];
}

export function getToolMap(): Record<string, Tool<any, any>> {
    const tools = getAllTools();
    const toolMap: Record<string, Tool<any, any>> = {};
    tools.forEach(tool => {
        // A Genkit tool has an 'info' property with its metadata.
        if (tool && tool.info?.name) {
            toolMap[tool.info.name] = tool;
        }
    });
    return toolMap;
}

export function getToolsForAgent(agent: AgentDefinition): Tool<any, any>[] {
  if (!agent.tools) return [];
  const toolMap = getToolMap();
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
