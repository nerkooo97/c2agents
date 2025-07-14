// This is a new file for the file-based tool management system.
import fs from 'fs/promises';
import path from 'path';
import type { ToolDefinition } from '@/lib/types';

// Helper to sanitize tool name for folder access
const sanitizeToolName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const toolsDir = path.join(process.cwd(), 'src', 'tools');
const fsPromises = fs.promises;

// Loads all tool definitions from the /src/tools directory.
export async function loadTools(): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];
    
    try {
        await fsPromises.access(toolsDir);
        const toolFolders = (await fsPromises.readdir(toolsDir, { withFileTypes: true }))
            .filter((dirent: fs.Dirent) => dirent.isDirectory())
            .map((dirent: fs.Dirent) => dirent.name);

        for (const folderName of toolFolders) {
            const indexPath = path.join(toolsDir, folderName, 'index.ts');
            try {
                // Only import if index.ts exists
                if (fs.existsSync(indexPath)) {
                  const { default: tool } = await import(`@/tools/${folderName}?update=${Date.now()}`);
                  if (tool) {
                      tools.push(tool);
                  }
                }
            } catch (e) {
                console.error(`[Tool Loader] Failed to load tool from ${folderName}:`, e);
            }
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // If the directory doesn't exist, create it.
            await fsPromises.mkdir(toolsDir, { recursive: true });
        } else {
            console.error(`[Tool Loader] Could not read tools directory:`, error);
        }
    }
    
    tools.sort((a, b) => a.name.localeCompare(b.name));
    return tools;
}
