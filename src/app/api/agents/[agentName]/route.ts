import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { Message } from '@/lib/types';

// Helper to construct the full model reference string
const getModelReference = (modelName: string): string => {
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}`;
    }
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}`;
    }
    return modelName;
};

export async function POST(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  const { agentName } = params;
  const agent = await getAgent(agentName);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (!agent.enableApiAccess) {
    return NextResponse.json({ error: 'API access is not enabled for this agent' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { input, sessionId, history } = body; 

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Allow passing history directly if memory is enabled for the agent.
    // A more robust solution would use the sessionId to retrieve history from a database.
    const agentHistory: Message[] | undefined = agent.enableMemory ? history : undefined;

    const response = await runAgentWithConfig({
        systemPrompt: agent.systemPrompt,
        userInput: input,
        tools: await getToolsForAgent(agent),
        model: getModelReference(agent.model),
        history: agentHistory,
    });

    return NextResponse.json({ response, sessionId });

  } catch (e) {
    console.error(`Error in agent API call for ${agentName}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
