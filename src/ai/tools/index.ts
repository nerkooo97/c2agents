// This file is intentionally left mostly blank to resolve a build issue.
// The correct configuration is in the root next.config.ts file.
import type { AgentDefinition } from '@/lib/types';
import type { Tool } from 'genkit/tool';
import { ai } from '@/ai/genkit';
import { calculator, webSearch, navigateToUrlTool, clickElementTool, typeTextTool, readPageContentTool } from './definitions';

// This list is now the single source of truth for tool names.
export const allDefinedTools: Tool<any, any>[] = [
    calculator, 
    webSearch,
    navigateToUrlTool,
    clickElementTool,
    typeTextTool,
    readPageContentTool,
];

// The map is still useful for server-side actions to find tool functions.
export function getToolMap(): Record<string, Tool<any, any>> {
    const toolMap: Record<string, Tool<any, any>> = {};
    allDefinedTools.forEach(tool => {
        if (tool.name) {
            toolMap[tool.name] = tool;
        }
    });
    return toolMap;
}

export function getToolsForAgent(agent: AgentDefinition): Tool<any, any>[] {
  if (!agent.tools || agent.tools.length === 0) return [];
  const availableTools = getToolMap();
  
  return agent.tools
    .map(toolName => availableTools[toolName])
    .filter((t): t is Tool<any, any> => t !== undefined);
};
