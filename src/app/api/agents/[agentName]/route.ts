import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';

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
    const { input, sessionId } = body; 

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    const response = await runAgentWithConfig({
        systemPrompt: agent.systemPrompt,
        userInput: input,
        tools: await getToolsForAgent(agent),
    });

    return NextResponse.json({ response, sessionId });

  } catch (e) {
    console.error(`Error in agent API call for ${agentName}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
