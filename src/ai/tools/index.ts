import type { AgentDefinition } from '@/lib/types';
import type { Tool } from 'genkit/tool';

// Explicitly import all available tools
import calculator from './calculator';
import delegateTask from './delegate-task';
import webSearch from './web-search';
// The playwright tool is disabled, so we handle its undefined export
import playwright from './playwright';

// Create a static array of all tools, filtering out any that are disabled (undefined)
const allTools: Tool<any, any>[] = [
    calculator,
    delegateTask,
    webSearch,
    playwright,
].filter((t): t is Tool<any, any> => t !== undefined);


// Create a map of tools by their name for quick lookups
const toolMap: Record<string, Tool<any, any>> = {};
allTools.forEach(tool => {
    if (tool.info?.name) {
        toolMap[tool.info.name] = tool;
    }
});

// Returns the static list of all tools
export function getAllTools(): Tool<any, any>[] {
    return allTools;
}

// Returns the static map of all tools
export function getToolMap(): Record<string, Tool<any, any>> {
    return toolMap;
}

// Gets the specific tools required for a given agent definition
export function getToolsForAgent(agent: AgentDefinition): Tool<any, any>[] {
  if (!agent.tools) return [];
  const agentTools: Tool<any, any>[] = [];
  const availableTools = getToolMap();
  
  for (const toolName of agent.tools) {
    if (availableTools[toolName]) {
      agentTools.push(availableTools[toolName]);
    }
  }
  return agentTools;
};
