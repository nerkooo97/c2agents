
import fs from 'fs';
import path from 'path';
import type { Tool } from 'genkit/tool';
import type { AgentDefinition } from '@/lib/types';

// Dynamically load tools from the src/ai/tools directory.
// Each tool should be in its own folder, with an index.ts file
// that default exports the Genkit Tool object.
const toolsDir = path.join(process.cwd(), 'src', 'ai', 'tools');
const loadedToolMap: Record<string, Tool<any, any>> = {};

// This code runs on server start. It scans the directory, and if it finds
// valid tool definition files, it registers them with the application.
// This allows you to add or remove tools just by adding or removing folders.
try {
  if (fs.existsSync(toolsDir)) {
    const toolFolders = fs.readdirSync(toolsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const toolFolderName of toolFolders) {
      try {
        // We use a dynamic require here, which relies on the server environment's
        // ability to resolve and execute TypeScript files (as `next dev` does).
        const toolConfigPath = path.join(toolsDir, toolFolderName, 'index.ts');
        if (fs.existsSync(toolConfigPath)) {
          const toolModule = require(toolConfigPath);
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


export const toolMap = loadedToolMap;
export const allTools = Object.values(toolMap);

// Helper to get full tool objects from agent's tool names
export const getToolsForAgent = (agent: AgentDefinition): Tool<any, any>[] => {
  if (!agent.tools) return [];
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
