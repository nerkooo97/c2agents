import { NextResponse } from 'next/server';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { AgentDefinition, Message } from '@/lib/types';
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
            conversationHistory = JSON.parse(conversation.messages) as Message[];
        }
    }

    const response = await runAgentWithConfig({
        systemPrompt: agent.systemPrompt,
        userInput: input,
        tools: getToolsForAgent(agent),
        model: getModelReference(agent.model),
        history: conversationHistory,
    });
    
    const finalResponseText = response.text ?? "No response generated.";

    if (agent.enableMemory && sessionId) {
         const newHistory = [
            ...conversationHistory,
            { role: 'user', content: input },
            { role: 'model', content: finalResponseText },
        ];
        await db.conversation.upsert({
            where: { sessionId },
            create: { sessionId, messages: JSON.stringify(newHistory) },
            update: { messages: JSON.stringify(newHistory) },
        });
    }

    return NextResponse.json({ response: finalResponseText, sessionId });

  } catch (e) {
    console.error(`Error in agent API call for ${agentName}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
