import { NextResponse } from 'next/server';
import { agents } from '@/lib/agent-registry';
import type { AgentInfo } from '@/lib/types';

export async function GET() {
  const agentInfos: AgentInfo[] = agents.map(agent => ({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    toolsCount: agent.tools.length,
    apiAccess: agent.enableApiAccess,
    realtime: agent.realtime,
  }));
  return NextResponse.json(agentInfos);
}
