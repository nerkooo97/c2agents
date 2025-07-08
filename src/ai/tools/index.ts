import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Tool } from 'genkit/tool';

export const calculator = ai.defineTool({
  name: 'calculator',
  description: 'Useful for getting the answer to a mathematical expression.',
  inputSchema: z.object({
    expression: z.string().describe('A plain mathematical expression that can be evaluated.'),
  }),
  outputSchema: z.number(),
}, async (input) => {
  try {
    // eslint-disable-next-line no-eval
    return eval(input.expression) as number;
  } catch (e) {
    return NaN;
  }
});

export const webSearch = ai.defineTool({
  name: 'webSearch',
  description: 'Useful for searching the web to get up-to-date information on any topic.',
  inputSchema: z.object({
    query: z.string().describe('A search query to run on the web.'),
  }),
  outputSchema: z.string(),
}, async (input) => {
  // In a real app, you would implement a call to a search API here.
  return `Web search results for "${input.query}": Fictional placeholder search results.`;
});

export const playwrightTool = ai.defineTool({
    name: 'playwright',
    description: 'Runs Playwright commands via an MCP server to automate browser actions.',
    inputSchema: z.object({
        script: z.string().describe('The Playwright script to execute.'),
    }),
    outputSchema: z.string().describe('The result from the Playwright script execution.'),
}, async (input) => {
    // In a real application, this function would communicate with the running
    // MCP server process identified by the name 'playwright'. This could be
    // via an HTTP request, a message queue, or another IPC mechanism.
    console.log(`Calling 'playwright' MCP server with script: ${input.script}`);
    // Fictional placeholder response.
    return `Placeholder response: Successfully executed Playwright script for "${input.script}".`;
});


export const allTools = [calculator, webSearch, playwrightTool];

export const toolMap: Record<string, Tool<any, any>> = {
  calculator,
  webSearch,
  playwright: playwrightTool,
};
