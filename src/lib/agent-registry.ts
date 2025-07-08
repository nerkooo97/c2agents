import fs from 'fs';
import path from 'path';
import type { AgentDefinition, McpServerConfig } from '@/lib/types';

// Dynamically load agents from the src/agents directory.
// Each agent should be in its own folder, with an index.ts file
// that default exports the AgentDefinition object.
const agentsDir = path.join(process.cwd(), 'src', 'agents');
const loadedAgents: AgentDefinition[] = [];

// This code runs on server start. It scans the directory, and if it finds
// valid agent definition files, it loads them into the application.
// This allows you to add or remove agents just by adding or removing folders.
try {
  if (fs.existsSync(agentsDir)) {
    const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const agentFolderName of agentFolders) {
      try {
        // We use a dynamic require here, which relies on the server environment's
        // ability to resolve and execute TypeScript files (as `next dev` does).
        const agentConfigPath = path.join(agentsDir, agentFolderName, 'index.ts');
        if (fs.existsSync(agentConfigPath)) {
          const agentModule = require(agentConfigPath);
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

export const agents = loadedAgents;

export const getAgent = (name: string): AgentDefinition | undefined => {
  return agents.find((agent) => agent.name === name);
};

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
