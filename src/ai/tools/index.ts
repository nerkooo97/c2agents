
import type { AgentDefinition } from '@/lib/types';
import type { Tool } from 'genkit/tool';
import fs from 'fs';
import path from 'path';

// This function dynamically loads all tools from the current directory.
async function loadTools(): Promise<Tool<any, any>[]> {
    const tools: Tool<any, any>[] = [];
    const toolsDir = __dirname;
    
    try {
        const toolFolders = fs.readdirSync(toolsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folderName of toolFolders) {
            const indexPath = path.join(toolsDir, folderName, 'index.ts');
            if (fs.existsSync(indexPath)) {
                try {
                    // Dynamically import the tool module
                    const toolModule = await import(`./${folderName}`);
                    const tool = toolModule.default;

                    // A simple check to see if it's a valid tool object
                    if (tool && typeof tool === 'function' && tool.name === 'actionFn') {
                         tools.push(tool);
                    }
                } catch (e) {
                    console.error(`[Tool Loader] Failed to load tool from ${folderName}:`, e);
                }
            }
        }
    } catch (error) {
        console.error(`[Tool Loader] Could not read tools directory:`, error);
    }
    
    return tools;
}


// We store the promise so that the loading process is only initiated once.
const toolsPromise = loadTools();

export async function getAllTools(): Promise<Tool<any, any>[]> {
    return toolsPromise;
}

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    const allTools = await getAllTools();
    const toolMap: Record<string, Tool<any, any>> = {};
    allTools.forEach(tool => {
        if (tool.info?.name) {
            toolMap[tool.info.name] = tool;
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
