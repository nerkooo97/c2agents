
import fs from 'fs';
import path from 'path';
import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';

let cachedToolMap: Record<string, Tool<any, any>> | null = null;

async function loadTools(): Promise<Record<string, Tool<any, any>>> {
    if (cachedToolMap) {
        return cachedToolMap;
    }

    const toolsDir = path.join(process.cwd(), 'src', 'ai', 'tools');
    const loadedToolMap: Record<string, Tool<any, any>> = {};

    try {
        if (fs.existsSync(toolsDir)) {
            const toolFolders = fs.readdirSync(toolsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const toolFolderName of toolFolders) {
                try {
                    const toolConfigPath = path.join(toolsDir, toolFolderName, 'index.ts');
                    if (fs.existsSync(toolConfigPath)) {
                        // Use a dynamic import with a path alias and template literal for better bundler compatibility
                        const toolModule = await import(`@/ai/tools/${toolFolderName}/index.ts`);
                        const tool = toolModule.default as Tool<any, any>;
                        if (tool && tool.name) {
                            loadedToolMap[tool.name] = tool;
                        } else {
                            console.warn(`[Tool Loader] Tool in '${toolFolderName}' is missing a default export or a name.`);
                        }
                    }
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    console.error(`[Tool Loader] Error loading tool from '${toolFolderName}': ${errorMessage}`);
                }
            }
            console.log(`[Tool Loader] Successfully loaded ${Object.keys(loadedToolMap).length} tools.`);
        } else {
            console.warn(`[Tool Loader] Tools directory not found at ${toolsDir}. No tools will be loaded.`);
        }
    } catch (error) {
        console.error(`[Tool Loader] Could not read tools directory at ${toolsDir}:`, error);
    }
    
    cachedToolMap = loadedToolMap;
    return cachedToolMap;
}

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    return await loadTools();
}

export async function getAllTools(): Promise<Tool<any, any>[]> {
    const toolMap = await getToolMap();
    return Object.values(toolMap);
}

// Helper to get full tool objects from agent's tool names
export async function getToolsForAgent(agent: AgentDefinition): Promise<Tool<any, any>[]> {
  if (!agent.tools) return [];
  const toolMap = await getToolMap();
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
