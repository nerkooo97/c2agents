import type { Tool } from 'genkit/tool';
import { calculator, webSearch, navigateToUrlTool, clickElementTool, typeTextTool, readPageContentTool } from './definitions';

// Statically define all tools available in the application.
// This is more stable than dynamic discovery.
export const allDefinedTools: Tool<any, any>[] = [
    calculator,
    webSearch,
    navigateToUrlTool,
    clickElementTool,
    typeTextTool,
    readPageContentTool,
];

// This function now returns the statically defined list of tools.
export function getAllTools(): Tool<any, any>[] {
    return allDefinedTools;
}

// Creates a map of tools for quick lookup.
export function getToolMap(): Record<string, Tool<any, any>> {
    const toolMap: Record<string, Tool<any, any>> = {};
    getAllTools().forEach(tool => {
        if (tool.name) {
            toolMap[tool.name] = tool;
        }
    });
    return toolMap;
}

// Filters the provided list of tools based on an agent's definition.
export function getToolsForAgent(
    agent: import('@/lib/types').AgentDefinition
): Tool<any, any>[] {
    if (!agent.tools || agent.tools.length === 0) return [];
  
    const toolMap = getToolMap();

    return agent.tools
        .map(toolName => toolMap[toolName])
        .filter((t): t is Tool<any, any> => t !== undefined);
};
