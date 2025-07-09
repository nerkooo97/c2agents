
import fs from 'fs';
import path from 'path';
import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';


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
                    const { default: tool } = await import(`@/ai/tools/${folderName}`);
                    // A Genkit tool has an 'info' property with its metadata.
                    if (tool && typeof tool === 'function' && tool.info?.name) {
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

const allToolsPromise = loadTools();

export async function getAllTools(): Promise<Tool<any, any>[]> {
    return allToolsPromise;
}

export async function getToolMap(): Promise<Record<string, Tool<any, any>>> {
    const allTools = await getAllTools();
    const toolMap: Record<string, Tool<any, any>> = {};
    allTools.forEach(tool => {
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
