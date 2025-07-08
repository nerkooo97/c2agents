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

export const fetchModelContext = ai.defineTool({
  name: 'fetchModelContext',
  description: 'Useful for retrieving specific, internal context from a Model Context Protocol (MCP) server.',
  inputSchema: z.object({
    topic: z.string().describe('The topic to retrieve context for.'),
  }),
  outputSchema: z.string().describe('The context retrieved from the MCP server.'),
}, async (input) => {
  // In a real app, you would implement a client to call your MCP server here.
  // This could involve an HTTP request to an endpoint.
  console.log(`Fetching context for topic "${input.topic}" from MCP server...`);
  // Fictional placeholder response.
  return `Fictional context for "${input.topic}": The project's internal deadline is Q4. The budget is $50,000.`;
});


export const allTools = [calculator, webSearch, fetchModelContext];

export const toolMap: Record<string, Tool<any, any>> = {
  calculator,
  webSearch,
  fetchModelContext,
};
