import type { AgentDefinition } from '@/lib/types';

import myAgent from '@/agents/my-agent';
import nonApiAgent from '@/agents/non-api-agent';
import openai from '@/agents/openai';
import playwrightAgent from '@/agents/playwright-agent';
import realtimeVoiceAgent from '@/agents/realtime-voice-agent';
import testAgent1 from '@/agents/test-agent-1';

const allAgents: AgentDefinition[] = [
    myAgent,
    nonApiAgent,
    openai,
    playwrightAgent,
    realtimeVoiceAgent,
    testAgent1
];

export async function getAgents(): Promise<AgentDefinition[]> {
    return Promise.resolve(allAgents);
}

export async function getAgent(name: string): Promise<AgentDefinition | undefined> {
  return Promise.resolve(allAgents.find((agent) => agent.name === name));
}
