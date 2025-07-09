// This file is intentionally left mostly blank to resolve a build issue.
// The correct configuration is in the root next.config.ts file.
import type { AgentDefinition } from '@/lib/types';
import type { Tool } from 'genkit/tool';
import calculator from './calculator';
import delegateTask from './delegate-task';
import webSearch from './web-search';
import playwright from './playwright';

// Statically define all tools. This is more reliable than dynamic loading.
const allTools: (Tool<any, any> | undefined)[] = [
    calculator,
    delegateTask,
    webSearch,
    playwright,
];

// Filter out any undefined tools (like disabled ones) and create the final list and map.
const validTools = allTools.filter((t): t is Tool<any, any> => t !== undefined);

const toolMap: Record<string, Tool<any, any>> = {};
validTools.forEach(tool => {
    if (tool.info?.name) {
        toolMap[tool.info.name] = tool;
    }
});

export function getAllTools(): Tool<any, any>[] {
    return validTools;
}

export function getToolMap(): Record<string, Tool<any, any>> {
    return toolMap;
}

export function getToolsForAgent(agent: AgentDefinition): Tool<any, any>[] {
  if (!agent.tools || agent.tools.length === 0) return [];
  const availableTools = getToolMap();
  
  return agent.tools
    .map(toolName => availableTools[toolName])
    .filter((t): t is Tool<any, any> => t !== undefined);
};
