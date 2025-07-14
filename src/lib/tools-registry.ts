// This is a new file for the file-based tool management system.
import fs from 'fs';
import path from 'path';
import type { ToolDefinition } from '@/lib/types';

// Helper to sanitize tool name for folder access
const sanitizeToolName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const toolsDir = path.join(process.cwd(), 'src', 'tools');

// Loads all tool definitions from the /src/tools directory.
export async function loadTools(): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];
    
    try {
        await fs.access(toolsDir);
        const toolFolders = (await fs.readdir(toolsDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folderName of toolFolders) {
            const indexPath = path.join(toolsDir, folderName, 'index.ts');
            try {
                // Dynamically import to get the latest version of the file
                const { default: tool } = await import(`@/tools/${folderName}?update=${Date.now()}`);
                if (tool) {
                    tools.push(tool);
                }
            } catch (e) {
                console.error(`[Tool Loader] Failed to load tool from ${folderName}:`, e);
            }
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // If the directory doesn't exist, create it.
            await fs.mkdir(toolsDir, { recursive: true });
        } else {
            console.error(`[Tool Loader] Could not read tools directory:`, error);
        }
    }
    
    tools.sort((a, b) => a.name.localeCompare(b.name));
    return tools;
}

export function getAllMcpTools(): any[] {
  const toolsDir = path.join(process.cwd(), 'src', 'tools');
  if (!fs.existsSync(toolsDir)) return [];
  const toolFolders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());
  const tools = [];
  for (const folder of toolFolders) {
    const toolPath = path.join(toolsDir, folder, 'index.ts');
    if (fs.existsSync(toolPath)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tool = require(toolPath);
      tools.push(tool.default || tool);
    }
  }
  return tools;
}
