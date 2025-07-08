'use server';

import { getAgent, getToolsForAgent } from '@/lib/agent-registry';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
import type { ExecutionStep } from '@/lib/types';

export async function runAgent(
  agentName: string,
  prompt: string
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
  try {
    const agent = getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found.`);
    }

    const steps: ExecutionStep[] = [];

    steps.push({
      type: 'prompt',
      title: 'User Prompt',
      content: prompt,
    });

    const finalResponse = await runAgentWithConfig({
      systemPrompt: agent.systemPrompt,
      userInput: prompt,
      tools: getToolsForAgent(agent),
    });
    
    steps.push({
      type: 'response',
      title: 'Agent Response',
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
