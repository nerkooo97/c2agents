
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAgentDefinition } from '@/lib/agent-registry';
import { getToolsForAgent } from '@/ai/tools';
import db from '@/lib/db';
import type { Node, Edge } from 'reactflow';
import type { ModelReference } from 'genkit/model';
import { loadMcpPlugins } from '@/lib/plugin-loader';

// Helper to construct the full model reference string for Genkit
const getModelReference = (modelName: string): ModelReference<any> => {
    if (modelName.includes('/')) {
        return modelName as ModelReference<any>; // Already a full path
    }
    if (modelName.startsWith('gemini')) {
        return `googleai/${modelName}` as ModelReference<any>;
    }
    if (modelName.startsWith('gpt')) {
        return `openai/${modelName}` as ModelReference<any>;
    }
    // Fallback for custom models or other providers
    return modelName as ModelReference<any>;
};

const RunWorkflowInputSchema = z.object({
  goal: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  workflowExecutionId: z.string(),
  browserSessions: z.any(),
});

// This is the object streamed back to the client
const WorkflowChunkSchema = z.object({
  type: z.enum(['node-executing', 'node-finished', 'final-response', 'error']),
  nodeId: z.string().optional(),
  content: z.string().optional(),
  error: z.string().optional(),
});

export const runWorkflowFlow = ai.defineFlow(
  {
    name: 'runWorkflowFlow',
    inputSchema: RunWorkflowInputSchema,
    outputSchema: z.string(),
    streamSchema: WorkflowChunkSchema,
  },
  async ({ goal, nodes, edges, workflowExecutionId, browserSessions }, { stream }) => {
    console.log(`[runWorkflowFlow] Flow started for execution ID: ${workflowExecutionId}`);
    
    // Dynamically load MCP plugins for this specific run.
    const mcpPlugins = await loadMcpPlugins();
    if (mcpPlugins.length > 0) {
      ai.registry.registerPlugin(mcpPlugins);
      console.log(`[runWorkflowFlow] Dynamically loaded ${mcpPlugins.length} MCP plugins.`);
    }

    try {
      const findNextNodeIds = (sourceId: string): string[] => {
        return edges.filter((e: Edge) => e.source === sourceId).map((e: Edge) => e.target);
      };

      let currentNodeIds = findNextNodeIds('goal_node');
      let previousStepOutput = `Initial goal: ${goal}`;
      const visitedNodes = new Set<string>();

      let currentNodeId = currentNodeIds.length > 0 ? currentNodeIds[0] : null;
      console.log(`[runWorkflowFlow] Starting node traversal. First node ID: ${currentNodeId}`);

      while (currentNodeId && !visitedNodes.has(currentNodeId)) {
        visitedNodes.add(currentNodeId);
        console.log(`[runWorkflowFlow] Executing node: ${currentNodeId}`);

        const currentNode = nodes.find((node: Node) => node.id === currentNodeId);
        if (!currentNode) {
          const errorMsg = `Node with ID '${currentNodeId}' not found in workflow.`;
          console.error(`[runWorkflowFlow] ${errorMsg}`);
          stream.chunk({ type: 'error', error: errorMsg });
          throw new Error(errorMsg);
        }

        stream.chunk({ type: 'node-executing', nodeId: currentNodeId });
        console.log(`[runWorkflowFlow] Streamed 'node-executing' for ${currentNodeId}`);

        if (currentNode.type === 'customAgentNode') {
          const agentName = currentNode.data.agentName;
          if (!agentName) {
            const errorMsg = `Agent not selected for node ID ${currentNodeId}.`;
              console.error(`[runWorkflowFlow] ${errorMsg}`);
              stream.chunk({ type: 'error', error: errorMsg });
              throw new Error(errorMsg);
          }
          
          console.log(`[runWorkflowFlow] Node is an agent step. Agent: ${agentName}`);
          const agent = await getAgentDefinition(agentName);
          if (!agent) {
              const errorMsg = `Agent definition for '${agentName}' not found.`;
              console.error(`[runWorkflowFlow] ${errorMsg}`);
              stream.chunk({ type: 'error', error: errorMsg });
              throw new Error(errorMsg);
          }

          const startTime = Date.now();
          let finalResponse: string | undefined = '';

          try {
            const taskForThisStep = currentNode.data.task || agent.defaultTask || goal;
            
            const currentPrompt = `Based on the overall goal and the previous step's result, perform your task.
                \nOverall Goal: "${goal}"
                \nPrevious Step Result: "${previousStepOutput}"
                \nYour Specific Task for this step: "${taskForThisStep}"`;
            
            console.log(`[runWorkflowFlow] Assembled prompt for agent '${agentName}'.`);
            
            const agentTools = getToolsForAgent(agent);
            
            const response = await ai.generate({
                model: getModelReference(agent.model),
                system: agent.systemPrompt,
                prompt: currentPrompt,
                tools: agentTools,
                config: {
                    responseFormat: agent.responseFormat as any,
                },
                context: { workflowExecutionId, browserSessions },
              }
            );
            
            console.log(`[runWorkflowFlow] Agent '${agentName}' generated a response.`);
            finalResponse = response.text;
            const usage = response.usage;

            const endTime = Date.now();
            await db.agentExecutionLog.create({
                data: {
                    agentName: agent.name,
                    status: 'success',
                    latency: endTime - startTime,
                    inputTokens: usage?.inputTokens,
                    outputTokens: usage?.outputTokens,
                    totalTokens: usage?.totalTokens,
                },
            });

          } catch (e) {
              const endTime = Date.now();
              const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
              console.error(`[runWorkflowFlow] Error in agent step '${agentName}': ${errorMessage}`);
              await db.agentExecutionLog.create({
                data: {
                    agentName,
                    status: 'error',
                    latency: endTime - startTime,
                    errorDetails: errorMessage,
                },
            });
              stream.chunk({ type: 'error', error: `Error in agent step '${agentName}': ${errorMessage}` });
              throw new Error(`Error in agent step '${agentName}': ${errorMessage}`);
          }
          previousStepOutput = finalResponse || 'No output from this step.';
        } else if (currentNode.type === 'delayNode') {
          const delayMs = currentNode.data.delay || 1000;
          console.log(`[runWorkflowFlow] Node is a delay step. Delaying for ${delayMs}ms.`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          previousStepOutput = `Delayed for ${delayMs}ms.`;
        }

        console.log(`[runWorkflowFlow] Node ${currentNodeId} finished. Output: "${previousStepOutput.substring(0, 100)}..."`);
        stream.chunk({ type: 'node-finished', nodeId: currentNodeId, content: previousStepOutput });
        const nextNodeIds = findNextNodeIds(currentNodeId);
        currentNodeId = nextNodeIds.length > 0 ? nextNodeIds[0] : null;
        console.log(`[runWorkflowFlow] Next node ID is: ${currentNodeId}`);
      }

      console.log('[runWorkflowFlow] Workflow traversal complete. Sending final response.');
      stream.chunk({ type: 'final-response', content: previousStepOutput });
      return previousStepOutput;

    } finally {
      // Clean up dynamically loaded plugins.
      if (mcpPlugins.length > 0) {
        ai.registry.deletePlugin(mcpPlugins.map(p => p.name));
        console.log(`[runWorkflowFlow] Dynamically unloaded ${mcpPlugins.length} MCP plugins.`);
      }
    }
  }
);
