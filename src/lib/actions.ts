'use server';

import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { AgentDefinition, ExecutionStep, Message } from '@/lib/types';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Agent loading logic must be here because this is a server-only module.
async function getAgent(name: string): Promise<AgentDefinition | undefined> {
    const agentFolderName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const agentPath = path.join(process.cwd(), 'src', 'agents', agentFolderName, 'index.ts');

    try {
        if (fs.existsSync(agentPath)) {
            const { default: agent } = await import(`@/agents/${agentFolderName}`);
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
                const { default: agent } = await import(`@/agents/${folderName}`);
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
    // This handles cases where the full path might already be stored, or for other providers in the future.
    return modelName;
};

export async function runAgent(
  agentName: string,
  prompt: string,
  sessionId?: string
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
  const startTime = Date.now();
  try {
    const agent = await getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found.`);
    }

    let conversationHistory: Message[] = [];
    if (agent.enableMemory && sessionId) {
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
    
    const agentTools = await getToolsForAgent(agent);

    const genkitResponse = await runAgentWithConfig({
      systemPrompt: agent.systemPrompt,
      constraints: agent.constraints,
      responseFormat: agent.responseFormat,
      userInput: prompt,
      tools: agentTools,
      model: getModelReference(agent.model),
      history: conversationHistory,
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    // Log successful execution
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
    const endTime = Date.now();
    const latency = endTime - startTime;
    console.error('Error running agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    
    // Log error execution
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
  }
}
