'use server';

/**
 * @fileOverview The core LLM abstraction and agent response generation flow.
 *
 * - generateResponse - A function that generates an agent response based on prompts, memories, and tool outputs.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt for the LLM to generate a response.'),
  memory: z.string().optional().describe('Relevant memory to provide context for the LLM.'),
  toolOutput: z.string().optional().describe('Output from any tools used by the agent.'),
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The generated response from the LLM.'),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `You are an AI agent that generates responses based on the given prompt, memory, and tool outputs.

  Prompt: {{{prompt}}}

  {{#if memory}}
  Memory:
  {{memory}}
  {{/if}}

  {{#if toolOutput}}
  Tool Output:
  {{toolOutput}}
  {{/if}}

  Response:`, // Keep it open-ended for more creative responses
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await generateResponsePrompt(input);
    return output!;
  }
);
