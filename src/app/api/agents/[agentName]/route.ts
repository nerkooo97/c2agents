import { NextRequest } from 'next/server';
import { getToolsForAgent } from '@/ai/tools';
import { ai } from '@/ai/genkit';
import type { AgentDefinition, Message } from '@/lib/types';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import type { ModelReference } from 'genkit/model';

// Agent loading logic must be here because this is a server-only module.
async function getAgent(name: string): Promise<AgentDefinition | undefined> {
    const agentFolderName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const agentPath = path.join(process.cwd(), 'src', 'agents', agentFolderName, 'index.ts');

    try {
        if (fs.existsSync(agentPath)) {
            // Use a dynamic import with a cache-busting query to ensure the latest file is loaded
            const { default: agent } = await import(`@/agents/${agentFolderName}?update=${Date.now()}`);
            if (agent && agent.name === name) {
                return agent;
            }
        }
    } catch (e) {
        console.error(`[getAgent] Failed to load agent '${name}':`, e);
    }

    // Fallback to searching all agents if direct load fails (e.g., folder name mismatch)
    const agentsDir = path.join(process.cwd(), 'src', 'agents');
    const agentFolders = fs.readdirSync(agentsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const folderName of agentFolders) {
        const indexPath = path.join(agentsDir, folderName, 'index.ts');
        if (fs.existsSync(indexPath)) {
            try {
                const { default: agent } = await import(`@/agents/${folderName}?update=${Date.now()}`);
                if (agent && agent.name === name) {
                    return agent;
                }
            } catch (e) {
                // Ignore errors for individual agent loads in this loop
            }
        }
    }
    
    return undefined;
}

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

// This function handles the streaming response
async function streamAgentResponse(request: NextRequest, agent: AgentDefinition) {
  const body = await request.json();
  const { input, sessionId } = body;
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let conversationHistory: Message[] = [];
        if (agent.enableMemory && sessionId) {
            const conversation = await db.conversation.findUnique({ where: { sessionId } });
            if (conversation) {
                conversationHistory = JSON.parse(conversation.messages) as Message[];
            }
        }

        let fullSystemPrompt = agent.systemPrompt;
        if (agent.constraints) {
            fullSystemPrompt += `\n\n## CONSTRAINTS\nThe user has provided the following constraints that you MUST follow:\n${agent.constraints}`;
        }
        if (agent.responseFormat === 'json') {
            fullSystemPrompt += `\n\n## RESPONSE FORMAT\nYou MUST provide your final response in a valid JSON format. Do not include any explanatory text before or after the JSON object.`;
        }

        const agentTools = await getToolsForAgent(agent);
        
        // Use generateStream
        const { stream: responseStream, response: responsePromise } = ai.generateStream({
            model: getModelReference(agent.model) as ModelReference<any>,
            system: fullSystemPrompt,
            prompt: input,
            tools: agentTools,
            history: conversationHistory.map(m => ({ role: m.role, content: [{text: m.content}]})),
            config: {
                responseFormat: agent.responseFormat,
            }
        });

        // Stream chunks to the client
        let fullTextResponse = "";
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                fullTextResponse += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`));
            }
            if (chunk.toolRequest) {
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolRequest: chunk.toolRequest })}\n\n`));
            }
             if (chunk.toolResponse) {
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolResponse: chunk.toolResponse })}\n\n`));
            }
        }

        // Wait for the final response to get usage data and save history
        const finalResponse = await responsePromise;

        // Save history if memory is enabled
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
        
        // Send usage data
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: finalResponse.usage })}\n\n`));

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`));
      } finally {
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
    const agent = await getAgent(agentName);

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404 });
    }
    if (!agent.enableApiAccess) {
      return new Response(JSON.stringify({ error: 'API access is not enabled for this agent' }), { status: 403 });
    }

    return streamAgentResponse(request, agent);

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
