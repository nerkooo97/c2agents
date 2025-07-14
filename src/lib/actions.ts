

'use server';

import type { AgentDefinition, Message } from '@/lib/types';
import db from '@/lib/db';
import { getAgentDefinition } from './agent-registry';
import { runWorkflowFlow } from '@/ai/flows/run-workflow';
import type { Node, Edge } from 'reactflow';
import { ai } from '@/ai/genkit';
import { getToolsForAgent } from '@/ai/tools';
import { initBrowser, closeBrowser, type BrowserSession } from '@/ai/tools/browser';


// Helper to construct the full model reference string for Genkit
const getModelReference = (modelName: string): string => {
    if (modelName.includes('/')) {
        return modelName; // Already a full path, e.g., 'googleai/gemini-1.5-pro'
    }
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}`;
    }
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}`;
    }
    // Fallback for custom models or other providers
    return modelName;
};

// Minimal agent runner for single, direct calls (e.g., from Test pages)
// This does NOT handle complex workflow logic.
export async function runAgent(
  agentName: string,
  prompt: string,
  sessionId?: string
): Promise<{ response?: string; error?: string }> {
  const agent = await getAgentDefinition(agentName);
  if (!agent) {
    return { error: `Agent '${agentName}' not found.` };
  }

  const startTime = Date.now();
  // For single agent runs, we manage browser sessions directly if needed.
  const workflowExecutionId = sessionId || crypto.randomUUID();
  const browserSessions = new Map<string, BrowserSession>();
  
  try {
    if (agent.tools.some(t => ['navigateToUrl', 'clickElement', 'typeText', 'readPageContent'].includes(t))) {
      browserSessions.set(workflowExecutionId, await initBrowser());
    }

    let conversationHistory: Message[] = [];
    if (agent.enableMemory && sessionId) {
      const conversation = await db.conversation.findUnique({
        where: { sessionId },
      });
      if (conversation?.messages) {
        try {
          const parsedMessages = JSON.parse(
            conversation.messages
          ) as Message[];
          if (Array.isArray(parsedMessages)) {
            conversationHistory = parsedMessages;
          }
        } catch (e) {
          console.error('Error parsing conversation history from DB:', e);
        }
      }
    }

    const agentTools = getToolsForAgent(agent);

    let fullSystemPrompt = agent.systemPrompt;
    if (agent.constraints) {
      fullSystemPrompt += `\n\n## CONSTRAINTS\nThe user has provided the following constraints that you MUST follow:\n${agent.constraints}`;
    }
    if (agent.responseFormat === 'json') {
      fullSystemPrompt += `\n\n## RESPONSE FORMAT\nYou MUST provide your final response in a valid JSON object. Do not include any explanatory text before or after the JSON object.`;
    }

    const genkitResponse = await ai.generate({
      model: getModelReference(agent.model) as any,
      system: fullSystemPrompt,
      prompt,
      tools: agentTools,
      history: conversationHistory.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
      })),
      config: {
        responseFormat: agent.responseFormat as any,
      },
      context: { workflowExecutionId, browserSessions } // Pass context
    });

    const endTime = Date.now();
    const latency = endTime - startTime;
    const usage = genkitResponse.usage;
    const finalResponse =
      genkitResponse.text ?? 'I was unable to generate a response.';

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

    return { response: finalResponse };
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    await db.agentExecutionLog.create({
      data: {
        agentName,
        status: 'error',
        latency,
        errorDetails: errorMessage,
      },
    });
    return { error: errorMessage };
  } finally {
     const session = browserSessions.get(workflowExecutionId);
     if (session) {
         await closeBrowser(session);
         browserSessions.delete(workflowExecutionId);
     }
  }
}

export async function runWorkflow(
    goal: string, 
    nodes: Node[], 
    edges: Edge[]
) {
  const result = runWorkflowFlow.run({
    goal,
    nodes,
    edges,
    workflowExecutionId: crypto.randomUUID(),
    browserSessions: new Map(), // Not supported for non-streamed workflows yet
  });
  return { response: result, responsePromise: Promise.resolve({ response: result, error: null }) };
}
