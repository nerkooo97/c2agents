
'use server';

import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { AgentDefinition, ExecutionStep, Message } from '@/lib/types';
import db from '@/lib/db';
import { closeBrowser } from '@/ai/tools/browser';
import { getFlow, runInAction } from 'genkit';

// Explicitly import all agent definitions for reliability
import myAgent from '@/agents/my-agent';
import nonApiAgent from '@/agents/non-api-agent';
import openaiAgent from '@/agents/openai';
import realtimeVoiceAgent from '@/agents/realtime-voice-agent';
import testAgent1 from '@/agents/test-agent-1';
import browserAgent from '@/agents/browser-agent';

const allAgents: AgentDefinition[] = [
    myAgent,
    nonApiAgent,
    openaiAgent,
    realtimeVoiceAgent,
    testAgent1,
    browserAgent,
];

function getAgent(name: string): AgentDefinition | undefined {
    return allAgents.find(agent => agent.name === name);
}

// Helper to construct the full model reference string
const getModelReference = (modelName: string): string => {
    if (modelName.includes('/')) {
        return modelName; // Already a full path
    }
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}`;
    }
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}`;
    }
    return modelName;
};

export async function runAgent(
  agentName: string,
  prompt: string,
  sessionId?: string
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
    const agent = getAgent(agentName);
    if (!agent) {
        return { error: `Agent '${agentName}' not found.` };
    }

    // Use a unique ID for each agent run to manage browser state.
    // If a session ID is provided, use it to maintain state across messages.
    const traceId = sessionId || crypto.randomUUID();
    const startTime = Date.now();

    try {
        let conversationHistory: Message[] = [];
        if (agent.enableMemory && sessionId) {
            const conversation = await db.conversation.findUnique({ where: { sessionId } });
            if (conversation) {
                try {
                    const parsedMessages = JSON.parse(conversation.messages) as Message[];
                    if (Array.isArray(parsedMessages)) {
                        conversationHistory = parsedMessages;
                    }
                } catch (e) {
                    console.error("Error parsing conversation history from DB:", e);
                }
            }
        }

        const steps: ExecutionStep[] = [{
            type: 'prompt',
            title: 'User Prompt',
            content: prompt,
        }];

        const agentTools = getToolsForAgent(agent);

        const genkitResponse = await runInAction({ name: 'run-agent-flow' }, async () => {
            return await runAgentWithConfig({
                systemPrompt: agent.systemPrompt,
                constraints: agent.constraints,
                responseFormat: agent.responseFormat,
                userInput: prompt,
                tools: agentTools,
                model: getModelReference(agent.model),
                history: conversationHistory,
                traceId: traceId, // Pass traceId to the config
            });
        });

        const endTime = Date.now();
        const latency = endTime - startTime;
        const usage = genkitResponse.usage;

        await db.agentExecutionLog.create({
            data: {
                agentName,
                status: 'success',
                latency,
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

        if (agent.enableMemory && sessionId) {
            const newHistory = [
                ...conversationHistory,
                { role: 'user', content: prompt },
                { role: 'model', content: finalResponse },
            ];
            await db.conversation.upsert({
                where: { sessionId },
                create: { sessionId, messages: JSON.stringify(newHistory) },
                update: { messages: JSON.stringify(newHistory) },
            });
        }

        return {
            response: finalResponse,
            steps: steps,
        };

    } catch (error) {
        const endTime = Date.now();
        const latency = endTime - startTime;
        console.error(`[runAgent Error] for agent '${agentName}':`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        
        await db.agentExecutionLog.create({
            data: {
                agentName,
                status: 'error',
                latency,
                errorDetails: errorMessage,
            },
        });

        return {
            error: errorMessage,
        };
    } finally {
         // This block ensures the browser is always closed if it was opened.
        if (agent.tools.includes('navigateToUrl')) {
            await closeBrowser(traceId);
        }
    }
}
