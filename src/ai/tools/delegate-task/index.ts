import {ai} from '@/ai/genkit';
import {z} from 'zod';

const delegateTask = ai.defineTool({
  name: 'delegateTask',
  description: 'Delegates a specific task to another specialized agent. Use this when the user\'s request is outside your primary capabilities but falls within the expertise of another available agent. Returns the result from the delegated agent.',
  inputSchema: z.object({
    agentName: z.string().describe('The name of the agent to delegate the task to.'),
    task: z.string().describe('A clear, specific, and self-contained description of the task for the target agent to perform.'),
  }),
  outputSchema: z.string(),
}, async ({ agentName, task }) => {
    try {
        // Dynamically import runAgent to prevent circular dependencies at module load time.
        // The circular dependency is: delegateTask -> runAgent -> getToolsForAgent -> delegateTask
        const { runAgent } = await import('@/lib/actions');
        
        console.log(`[delegateTask] Delegating task "${task}" to agent "${agentName}"`);

        // Note: We don't pass a sessionId here, so the delegated agent runs statelessly
        // without access to the calling agent's memory. This is a safer default.
        const result = await runAgent(agentName, task);

        if (result.error) {
            console.error(`[delegateTask] Error from agent "${agentName}": ${result.error}`);
            return `Error: The agent '${agentName}' failed to execute the task. Reason: ${result.error}`;
        }
        
        const response = result.response || "The agent provided no response.";
        console.log(`[delegateTask] Response from agent "${agentName}": ${response}`);
        return response;

    } catch (e) {
        console.error('[delegateTask] An unexpected error occurred:', e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during task delegation.';
        return `Error: Could not delegate task. Reason: ${errorMessage}`;
    }
});

export default delegateTask;
