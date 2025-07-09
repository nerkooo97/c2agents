import {ai} from '@/ai/genkit';
import {z} from 'zod';

const delegateTask = ai.defineTool({
  name: 'delegateTask',
  description: 'Delegates a specific task to another specialized agent and returns the result. [Note: Temporarily disabled for maintenance.]',
  inputSchema: z.object({
    agentName: z.string().describe('The name of the agent to delegate the task to.'),
    task: z.string().describe('A clear and specific description of the task for the agent to perform.'),
  }),
  outputSchema: z.string(),
}, async ({ agentName, task }) => {
    // This tool is temporarily disabled to resolve a circular dependency issue
    // that was causing instability in the dashboard.
    return "Error: The 'delegateTask' tool is currently under maintenance. Please try again later.";
});

export default delegateTask;
