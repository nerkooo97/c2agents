import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { Message } from '@/lib/types';
import db from '@/lib/db';

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
    const { input, sessionId } = body; 

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }
    
    let conversationHistory: Message[] = [];
    if (agent.enableMemory && sessionId) {
        const conversation = await db.conversation.findUnique({ where: { sessionId } });
        if (conversation) {
            conversationHistory = conversation.messages;
        }
    }

    const response = await runAgentWithConfig({
        systemPrompt: agent.systemPrompt,
        userInput: input,
        tools: await getToolsForAgent(agent),
        model: getModelReference(agent.model),
        history: conversationHistory.length > 0 ? conversationHistory : undefined,
    });
    
    const finalResponseText = response.text ?? "No response generated.";

    if (agent.enableMemory && sessionId) {
         const newHistory = [
            ...conversationHistory,
            { role: 'user', content: input },
            { role: 'model', content: finalResponseText },
        ];
        const existingConversation = await db.conversation.findUnique({ where: { sessionId } });
        if (existingConversation) {
            await db.conversation.update({
                where: { sessionId },
                data: { messages: newHistory },
            });
        } else {
            await db.conversation.create({
                data: { sessionId, messages: newHistory },
            });
        }
    }


    return NextResponse.json({ response: finalResponseText, sessionId });

  } catch (e) {
    console.error(`Error in agent API call for ${agentName}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
