'use server';

import { getAgent } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { ExecutionStep, Message } from '@/lib/types';
import db from '@/lib/db';

// Helper to construct the full model reference string
const getModelReference = (modelName: string): string => {
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}`;
    }
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}`;
    }
    // This handles cases where the full path might already be stored, or for other providers in the future.
    return modelName;
};

export async function runAgent(
  agentName: string,
  prompt: string,
  sessionId?: string,
  historyOverride?: Message[],
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
  try {
    const agent = await getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found.`);
    }

    let conversationHistory: Message[] = [];
    if (historyOverride) {
        conversationHistory = historyOverride;
    } else if (agent.enableMemory && sessionId) {
        const conversation = await db.conversation.findUnique({ where: { sessionId } });
        if (conversation) {
            conversationHistory = conversation.messages;
        }
    }
    
    const steps: ExecutionStep[] = [];

    steps.push({
      type: 'prompt',
      title: 'User Prompt',
      content: prompt,
    });
    
    const genkitResponse = await runAgentWithConfig({
      systemPrompt: agent.systemPrompt,
      constraints: agent.constraints,
      responseFormat: agent.responseFormat,
      userInput: prompt,
      tools: await getToolsForAgent(agent),
      model: getModelReference(agent.model),
      history: conversationHistory.length > 0 ? conversationHistory : undefined,
    });

    // Log successful execution
    const usage = genkitResponse.usage;
    await db.agentExecutionLog.create({
        data: {
            agentName,
            status: 'success',
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            totalTokens: usage?.totalTokens,
        },
    });

    if (genkitResponse.history) {
      for (const message of genkitResponse.history) {
        if (message.role === 'model' && message.content.some(p => p.toolRequest)) {
          const toolRequestPart = message.content.find(p => p.toolRequest)!;
          const toolRequest = toolRequestPart.toolRequest!;
           steps.push({
            type: 'tool',
            title: `Tool Call: ${toolRequest.name}`,
            content: `The agent decided to use the '${toolRequest.name}' tool.`,
            toolName: toolRequest.name,
            toolInput: JSON.stringify(toolRequest.input, null, 2),
          });
        } else if (message.role === 'tool') {
          const toolResponsePart = message.content.find(p => p.toolResponse)!;
          const toolResponse = toolResponsePart.toolResponse!;
           steps.push({
            type: 'tool',
            title: `Tool Result: ${toolResponse.name}`,
            content: `${JSON.stringify(toolResponse.output, null, 2)}`,
            toolName: toolResponse.name,
          });
        }
      }
    }

    const finalResponse = genkitResponse.text ?? 'I was unable to generate a response.';
    
    steps.push({
      type: 'response',
      title: 'Final Response',
      content: finalResponse,
    });

    // Update conversation history in DB if memory is enabled
    if (agent.enableMemory && sessionId) {
        const newHistory = [
            ...conversationHistory,
            { role: 'user', content: prompt },
            { role: 'model', content: finalResponse },
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


    return {
      response: finalResponse,
      steps: steps,
    };
  } catch (error) {
    console.error('Error running agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    
    // Log error execution
    await db.agentExecutionLog.create({
        data: {
            agentName,
            status: 'error',
            errorDetails: errorMessage,
        },
    });

    return {
      error: errorMessage,
    };
  }
}
