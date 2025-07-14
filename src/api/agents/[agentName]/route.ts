import { NextRequest, NextResponse } from 'next/server';
import { getToolsForAgent } from '@/ai/tools';
import { ai } from '@/ai/genkit';
import type { AgentDefinition, Message } from '@/lib/types';
import db from '@/lib/db';
import type { ModelReference } from 'genkit/model';
import { closeBrowser, initBrowser, BrowserSession } from '@/ai/tools/browser';
import { getAgentDefinition } from '@/lib/agent-registry';


// Helper to construct the full model reference string
const getModelReference = (modelName: string): string => {
    if (modelName.includes('/')) {
        return modelName; // Already a full path
    }
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}`;
    }
    // All gpt models from openAI need the prefix.
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}`;
    }
    // Fallback for custom models or other providers
    return modelName;
};

// This function handles the streaming response
async function streamAgentResponse(request: NextRequest, agent: AgentDefinition) {
  const body = await request.json();
  const { input, sessionId } = body;
  
  const workflowExecutionId = sessionId || crypto.randomUUID();
  const browserSessions = new Map<string, BrowserSession>();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      try {
        if (agent.tools.some(t => ['navigateToUrl', 'clickElement', 'typeText', 'readPageContent'].includes(t))) {
            browserSessions.set(workflowExecutionId, await initBrowser());
        }

        let conversationHistory: Message[] = [];
        if (agent.enableMemory && sessionId) {
            const conversation = await db.conversation.findUnique({ where: { sessionId } });
            if (conversation?.messages) {
                try {
                    const parsedMessages = JSON.parse(conversation.messages) as Message[];
                    if(Array.isArray(parsedMessages)) {
                        conversationHistory = parsedMessages;
                    }
                } catch (e) {
                    console.error("Error parsing conversation history:", e);
                    // Handle case where history is not valid JSON
                    conversationHistory = [];
                }
            }
        }

        let fullSystemPrompt = agent.systemPrompt;
        if (agent.constraints) {
            fullSystemPrompt += `\n\n## CONSTRAINTS\nThe user has provided the following constraints that you MUST follow:\n${agent.constraints}`;
        }
        if (agent.responseFormat === 'json') {
            fullSystemPrompt += `\n\n## RESPONSE FORMAT\nYou MUST provide your final response in a valid JSON format. Do not include any explanatory text before or after the JSON object.`;
        }
        
        const agentTools = getToolsForAgent(agent);
        
        const { stream: responseStream, response: responsePromise } = ai.generateStream({
            model: getModelReference(agent.model) as ModelReference<any>,
            system: fullSystemPrompt,
            prompt: input,
            tools: agentTools,
            history: conversationHistory.map(m => ({ role: m.role, content: [{text: m.content}]})),
            config: {
                responseFormat: agent.responseFormat as any,
            },
            context: { workflowExecutionId, browserSessions }, // Pass context
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`));
            }
            if (chunk.toolRequest) {
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolRequest: chunk.toolRequest })}\n\n`));
            }
             if (chunk.toolResponse) {
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolResponse: chunk.toolResponse })}\n\n`));
            }
        }

        const finalResponse = await responsePromise;
        const endTime = Date.now();
        const fullTextResponse = finalResponse.text ?? "";

        const usage = finalResponse.usage;
        await db.agentExecutionLog.create({
            data: {
                agentName: agent.name,
                status: 'success',
                latency: endTime - startTime,
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
                totalTokens: usage?.totalTokens,
            },
        });

        if (agent.enableMemory && sessionId) {
            const newHistory = [
                ...conversationHistory,
                { role: 'user', content: input },
                { role: 'model', content: fullTextResponse },
            ];
            await db.conversation.upsert({
                where: { sessionId },
                create: { sessionId, messages: JSON.stringify(newHistory) },
                update: { messages: JSON.stringify(newHistory) },
            });
             controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', content: 'History saved.' })}\n\n`));
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: finalResponse.usage })}\n\n`));

      } catch (e) {
        const endTime = Date.now();
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        console.error(`[Agent Execution Error] in agent '${agent.name}':`, e);
         await db.agentExecutionLog.create({
            data: {
                agentName: agent.name,
                status: 'error',
                latency: endTime - startTime,
                errorDetails: errorMessage,
            },
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`));
      } finally {
        const session = browserSessions.get(workflowExecutionId);
        if (session) {
            await closeBrowser(session);
            browserSessions.delete(workflowExecutionId);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agentName: string } }
) {
  try {
    const agentName = decodeURIComponent(params.agentName);
    const agent = await getAgentDefinition(agentName);

    if (!agent) {
      console.error(`[API POST] Agent '${agentName}' not found.`);
      return new Response(JSON.stringify({ error: `Agent '${agentName}' not found` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (!agent.enableApiAccess) {
      return new Response(JSON.stringify({ error: 'API access is not enabled for this agent' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    return streamAgentResponse(request, agent);

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    console.error(`[API POST] General error for agent '${params.agentName}':`, e);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
