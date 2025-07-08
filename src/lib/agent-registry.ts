import fs from 'fs';
import path from 'path';
import type { AgentDefinition, McpServerConfig } from '@/lib/types';

let cachedAgents: AgentDefinition[] | null = null;

// This function will scan the directory and load agents.
// It caches the result to avoid repeated file system access.
async function loadAgents(): Promise<AgentDefinition[]> {
  if (cachedAgents) {
    return cachedAgents;
  }

  const agentsDir = path.join(process.cwd(), 'src', 'agents');
  const loadedAgents: AgentDefinition[] = [];

  try {
    if (fs.existsSync(agentsDir)) {
      const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const agentFolderName of agentFolders) {
        try {
          const agentConfigPath = path.join(agentsDir, agentFolderName, 'index.ts');
          if (fs.existsSync(agentConfigPath)) {
            // Use a dynamic import with a path alias and template literal for better bundler compatibility
            const agentModule = await import(`@/agents/${agentFolderName}/index.ts`);
            if (agentModule.default && agentModule.default.name) {
              loadedAgents.push(agentModule.default as AgentDefinition);
            } else {
              console.warn(`[Agent Loader] Agent config in '${agentFolderName}' is missing a default export or a name.`);
            }
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`[Agent Loader] Error loading agent from '${agentFolderName}': ${errorMessage}`);
        }
      }
       console.log(`[Agent Loader] Successfully loaded ${loadedAgents.length} agents.`);
    } else {
      console.warn(`[Agent Loader] Agents directory not found at ${agentsDir}. No agents will be loaded.`);
    }
  } catch (error) {
      console.error(`[Agent Loader] Could not read agents directory at ${agentsDir}:`, error);
  }
  
  cachedAgents = loadedAgents;
  return cachedAgents;
}


export async function getAgents(): Promise<AgentDefinition[]> {
    return await loadAgents();
}

export async function getAgent(name: string): Promise<AgentDefinition | undefined> {
  const agents = await loadAgents();
  return agents.find((agent) => agent.name === name);
}

// Configuration for Model Context Protocol (MCP) servers.
// In a real application, a separate process manager would be responsible for
// starting and stopping these servers based on this configuration.
export const mcpServers: Record<string, McpServerConfig> = {
  playwright: {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
  },
  customMcp: {
    command: 'node',
    args: ['./custom-mcp-server.js'],
  },
};
