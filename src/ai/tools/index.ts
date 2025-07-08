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

export const gameServerQuery = ai.defineTool({
  name: 'gameServerQuery',
  description: 'Useful for getting the status of a game server, like player count and current map.',
  inputSchema: z.object({
    serverAddress: z.string().describe('The address of the game server, e.g., "play.example.com:25565".'),
  }),
  outputSchema: z.string().describe('A summary of the server status.'),
}, async (input) => {
  // In a real app, you would implement a call to the server here.
  // This could involve using a library like 'gamedig' or making a direct TCP/UDP request.
  console.log(`Querying game server at: ${input.serverAddress}`);
  // Fictional placeholder response.
  return `Server status for "${input.serverAddress}": 16/100 players online on map "world".`;
});


export const allTools = [calculator, webSearch, gameServerQuery];

export const toolMap: Record<string, Tool<any, any>> = {
  calculator,
  webSearch,
  gameServerQuery,
};
