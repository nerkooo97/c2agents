'use server';

import { getAgent, getAgents } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';
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

    // If this is the coordinator agent, inject the list of other agents into the system prompt.
    if (agent.name === 'Coordinator Agent') {
        const allAgents = await getAgents();
        const availableAgents = allAgents.filter(a => a.name !== agent.name); // Exclude self
        
        const agentListForPrompt = availableAgents.map(a => 
            `- **${a.name}**: ${a.description} (Tools: ${a.tools.join(', ') || 'none'})`
        ).join('\n');

        if (agentListForPrompt) {
          const contextHeader = 'You can delegate tasks to the following available agents:\n\n';
          systemPrompt = `${contextHeader}${agentListForPrompt}\n\n---\n\n${agent.systemPrompt}`;
        }
    }


    const finalResponse = await runAgentWithConfig({
      systemPrompt: systemPrompt,
      userInput: prompt,
      tools: await getToolsForAgent(agent),
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
