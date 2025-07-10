
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import db from '@/lib/db';
import { runAgent } from '@/lib/actions';
import type { ExecutionStep } from '@/lib/types';

const runWorkflowTool = ai.defineTool({
    name: 'runWorkflow',
    description: 'Executes a saved workflow by its ID and returns the final result. Useful for running complex, multi-step processes.',
    inputSchema: z.object({
        workflowId: z.string().uuid().describe('The unique ID of the workflow to execute.'),
        input: z.string().optional().describe('An optional input to override the workflow\'s default goal.'),
    }),
    outputSchema: z.string(),
}, async (input) => {
    const { workflowId, input: workflowInput } = input;

    try {
        const workflow = await db.workflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            return `Error: Workflow with ID '${workflowId}' not found.`;
        }
        
        const goal = workflowInput || workflow.goal;

        if (!goal) {
            return 'Error: Workflow goal is not defined.';
        }
        
        let previousStepOutput = `Initial goal: ${goal}`;
        const allSteps: ExecutionStep[] = [];
        
        for (const step of workflow.planSteps) {
            if (step.type === 'agent') {
                const currentPrompt = `Based on the overall goal and the previous step's result, perform your task.
\nOverall Goal: "${goal}"
\nPrevious Step Result: "${previousStepOutput}"
\nYour Task: "${step.task}"`;
                
                const result = await runAgent(step.agentName, currentPrompt);
                
                if (result.error) {
                    return `Error in step for agent ${step.agentName}: ${result.error}`;
                }
                
                previousStepOutput = result.response || 'No output from this step.';
                if (result.steps) {
                    allSteps.push(...result.steps);
                }
            } else if (step.type === 'delay') {
                const delayTime = step.delay || 0;
                if (delayTime > 0) {
                     await new Promise(resolve => setTimeout(resolve, delayTime));
                }
            }
        }

        return previousStepOutput;

    } catch (e) {
        console.error(`Error in runWorkflow tool for ${workflowId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return `Failed to execute workflow: ${errorMessage}`;
    }
});

export default runWorkflowTool;
