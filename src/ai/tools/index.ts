
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


// We store the promise so that the loading process is only initiated once.
const allToolsPromise = Promise.resolve(allTools.filter(Boolean) as Tool<any, any>[]);

export async function getAllTools(): Promise<Tool<any, any>[]> {
    return allToolsPromise;
}

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    const allTools = await getAllTools();
    const toolMap: Record<string, Tool<any, any>> = {};
    allTools.forEach(tool => {
        // A Genkit tool has an 'info' property with its metadata.
        if (tool && tool.info?.name) {
            toolMap[tool.info.name] = tool;
        }
    });
    return toolMap;
}

export async function getToolsForAgent(agent: AgentDefinition): Promise<Tool<any, any>[]> {
  if (!agent.tools) return [];
  const toolMap = await getToolMap();
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
