import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/agent-registry';
import type { AgentDefinition } from '@/lib/types';

export async function GET() {
  const agents = await getAgents();
  // We map to AgentDefinition to send the full agent data to the dashboard
  // In a real app with sensitive data, this would be a different, public type.
  const agentInfos: AgentDefinition[] = agents.map(agent => ({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    tools: agent.tools,
    enableApiAccess: agent.enableApiAccess,
    realtime: agent.realtime,
  }));
  return NextResponse.json(agentInfos);
}
