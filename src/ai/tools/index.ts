import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';

import calculator from './calculator';
import delegateTask from './delegate-task';
import playwright from './playwright';
import webSearch from './web-search';

const allTools: Tool<any, any>[] = [
    calculator,
    delegateTask,
    playwright,
    webSearch,
];

const toolMap: Record<string, Tool<any, any>> = {};
allTools.forEach(tool => {
    if (tool && tool.name) {
        toolMap[tool.name] = tool;
    }
});

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    return Promise.resolve(toolMap);
}

export async function getAllTools(): Promise<Tool<any, any>[]> {
    return Promise.resolve(allTools);
}

export async function getToolsForAgent(agent: AgentDefinition): Promise<Tool<any, any>[]> {
  if (!agent.tools) return [];
  const toolMap = await getToolMap();
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
