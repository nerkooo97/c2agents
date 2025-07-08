'use server';

import { getAgent, getAgents } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import { generateSpeech } from '@/ai/flows/text-to-speech';
import type { ExecutionStep } from '@/lib/types';

export async function runAgent(
  agentName: string,
  prompt: string
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
  try {
    const agent = await getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found.`);
    }

    const steps: ExecutionStep[] = [];

    steps.push({
      type: 'prompt',
      title: 'User Prompt',
      content: prompt,
    });
    
    let systemPrompt = agent.systemPrompt;

    if (agent.name === 'Coordinator Agent') {
        const allAgents = await getAgents();
        const availableAgents = allAgents.filter(a => a.name !== agent.name);
        
        const agentListForPrompt = availableAgents.map(a => 
            `- **${a.name}**: ${a.description} (Tags: ${a.tags?.join(', ') || 'none'})`
        ).join('\n');

        if (agentListForPrompt) {
          const contextHeader = 'You can delegate tasks to the following available agents:\n\n';
          systemPrompt = `${contextHeader}${agentListForPrompt}\n\n---\n\n${agent.systemPrompt}`;
        }
    }


    const genkitResponse = await runAgentWithConfig({
      systemPrompt: systemPrompt,
      userInput: prompt,
      tools: await getToolsForAgent(agent),
      model: agent.model,
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

    return {
      response: finalResponse,
      steps: steps,
    };
  } catch (error) {
    console.error('Error running agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return {
      error: errorMessage,
    };
  }
}

export async function generateSpeechAction(text: string): Promise<{ audioUrl?: string; error?: string; }> {
    try {
        const audioUrl = await generateSpeech(text);
        return { audioUrl };
    } catch (error) {
        console.error('Error generating speech:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { error: errorMessage };
    }
}
