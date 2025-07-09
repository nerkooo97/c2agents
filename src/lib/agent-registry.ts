
import fs from 'fs';
import path from 'path';
import type { AgentDefinition } from '@/lib/types';

async function loadAgents(): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];
    const agentsDir = path.join(process.cwd(), 'src', 'agents');
    
    try {
        const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folderName of agentFolders) {
            const indexPath = path.join(agentsDir, folderName, 'index.ts');
            if (fs.existsSync(indexPath)) {
                try {
                    const { default: agent } = await import(`@/agents/${folderName}`);
                    if (agent) {
                        agents.push(agent);
                    }
                } catch (e) {
                    console.error(`[Agent Loader] Failed to load agent from ${folderName}:`, e);
                }
            }
        }
    } catch (error) {
        console.error(`[Agent Loader] Could not read agents directory:`, error);
    }
    
    agents.sort((a, b) => a.name.localeCompare(b.name));
    return agents;
}

// We store the promise so that the loading process is only initiated once.
const agentsPromise = loadAgents();

export async function getAgents(): Promise<AgentDefinition[]> {
    return agentsPromise;
}

export async function getAgent(name: string): Promise<AgentDefinition | undefined> {
  const agents = await getAgents();
  return agents.find((agent) => agent.name === name);
}
