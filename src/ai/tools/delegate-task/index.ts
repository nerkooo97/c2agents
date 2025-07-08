import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getAgent } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import { runAgentWithConfig } from '@/ai/flows/run-agent';

const delegateTask = ai.defineTool({
  name: 'delegateTask',
  description: 'Delegates a specific task to another specialized agent and returns the result.',
  inputSchema: z.object({
    agentName: z.string().describe('The name of the agent to delegate the task to.'),
    task: z.string().describe('A clear and specific description of the task for the agent to perform.'),
  }),
  outputSchema: z.string(),
}, async ({ agentName, task }) => {
  const targetAgent = await getAgent(agentName);

  if (!targetAgent) {
    return `Error: Agent "${agentName}" not found. Cannot delegate task.`;
  }

  // Prevent recursive delegation to another coordinator to avoid loops.
  if (targetAgent.tags?.includes('coordinator')) {
      return `Error: Cannot delegate a task to another coordinator agent.`;
  }

  console.log(`[Coordinator] Delegating task "${task}" to agent "${agentName}"`);

  const response = await runAgentWithConfig({
      systemPrompt: targetAgent.systemPrompt,
      userInput: task,
      tools: await getToolsForAgent(targetAgent),
  });
  
  const resultText = response.text ?? `Agent '${agentName}' did not return a result.`;

  console.log(`[Coordinator] Received response from "${agentName}": ${resultText}`);

  return `Result from agent "${agentName}": ${resultText}`;
});

export default delegateTask;
