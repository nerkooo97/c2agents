import { NextResponse } from 'next/server';
import type { AgentDefinition } from '@/lib/types';
import { loadAgents } from '@/lib/agent-registry';

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
