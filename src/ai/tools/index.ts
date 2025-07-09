
import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// This asynchronous function loads all available tool definitions from the filesystem.
// Note: This approach relies on Next.js correctly handling dynamic imports.
async function loadTools(): Promise<Tool<any, any>[]> {
    const tools: Tool<any, any>[] = [];
    const toolsDir = path.join(process.cwd(), 'src', 'ai', 'tools');
    
    try {
        const toolFolders = fs.readdirSync(toolsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folderName of toolFolders) {
            const indexPath = path.join(toolsDir, folderName, 'index.ts');
            if (fs.existsSync(indexPath)) {
                try {
                    const { default: toolModule } = await import(`@/ai/tools/${folderName}`);
                    // Ensure the imported module is a valid tool before adding.
                    if (toolModule && typeof toolModule.actionFn === 'function') {
                        tools.push(toolModule);
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
    const tools = await getAllTools();
    const toolMap: Record<string, Tool<any, any>> = {};
    tools.forEach(tool => {
        // A Genkit tool has an 'info' property with its metadata.
        // We use a fallback to the action function name if info is not available.
        const toolName = tool.info?.name || tool.actionFn.name;
        if (toolName) {
            toolMap[toolName] = tool;
        }
    });
    return toolMap;
}

export async function getToolsForAgent(agent: AgentDefinition): Promise<Tool<any, any>[]> {
  if (!agent.tools) return [];
  const toolMap = await getToolMap();
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
