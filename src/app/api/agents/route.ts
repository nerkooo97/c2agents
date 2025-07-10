import { NextResponse } from 'next/server';
import type { AgentDefinition } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// This function is now defined directly in the API route
// to avoid bundling server-side 'fs' module in client components.
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
                    // Dynamically importing is necessary here for the server to pick up new files.
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


export async function GET() {
  const agents = await loadAgents();
  // We map to AgentDefinition to send the full agent data to the dashboard
  // In a real app with sensitive data, this would be a different, public type.
  const agentInfos: AgentDefinition[] = agents.map(agent => ({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    constraints: agent.constraints,
    responseFormat: agent.responseFormat,
    tools: agent.tools,
    enableApiAccess: agent.enableApiAccess,
    realtime: agent.realtime,
    enableMemory: agent.enableMemory || false,
    defaultTask: agent.defaultTask || '',
    tags: agent.tags || [],
    icon: agent.icon || 'Bot',
    iconColor: agent.iconColor || 'hsl(var(--primary))',
  }));
  return NextResponse.json(agentInfos);
}
