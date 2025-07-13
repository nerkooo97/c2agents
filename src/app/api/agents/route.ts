import { NextResponse } from 'next/server';
import type { AgentDefinition } from '@/lib/types';

// Explicitly import all agent definitions
import myAgent from '@/agents/my-agent';
import nonApiAgent from '@/agents/non-api-agent';
import openaiAgent from '@/agents/openai';
import realtimeVoiceAgent from '@/agents/realtime-voice-agent';
import testAgent1 from '@/agents/test-agent-1';


// Create a static list of all agents
const allAgents: AgentDefinition[] = [
    myAgent,
    nonApiAgent,
    openaiAgent,
    realtimeVoiceAgent,
    testAgent1
];

function loadAgents(): AgentDefinition[] {
    // Sort agents by name for consistent ordering
    allAgents.sort((a, b) => a.name.localeCompare(b.name));
    return allAgents;
}


export async function GET() {
  const agents = loadAgents();
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
