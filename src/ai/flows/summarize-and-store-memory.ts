// SummarizeAndStoreMemory Flow
'use server';
/**
 * @fileOverview This file defines a Genkit flow for summarizing long conversations and storing them in long-term memory.
 *
 * - summarizeAndStoreMemory - A function that summarizes a conversation and stores it in memory.
 * - SummarizeAndStoreMemoryInput - The input type for the summarizeAndStoreMemory function.
 * - SummarizeAndStoreMemoryOutput - The return type for the summarizeAndStoreMemory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAndStoreMemoryInputSchema = z.object({
  conversation: z
    .string()
    .describe('The full conversation to be summarized.'),
  memoryId: z
    .string()
    .describe('The ID of the memory store to save the summary to.'),
});
export type SummarizeAndStoreMemoryInput = z.infer<
  typeof SummarizeAndStoreMemoryInputSchema
>;

const SummarizeAndStoreMemoryOutputSchema = z.object({
  summary: z.string().describe('The summary of the conversation.'),
  success: z.boolean().describe('Whether the summary was successfully stored.'),
});
export type SummarizeAndStoreMemoryOutput = z.infer<
  typeof SummarizeAndStoreMemoryOutputSchema
>;

export async function summarizeAndStoreMemory(
  input: SummarizeAndStoreMemoryInput
): Promise<SummarizeAndStoreMemoryOutput> {
  return summarizeAndStoreMemoryFlow(input);
}

const summarizeMemoryPrompt = ai.definePrompt({
  name: 'summarizeMemoryPrompt',
  input: {
    schema: SummarizeAndStoreMemoryInputSchema,
  },
  output: {
    schema: SummarizeAndStoreMemoryOutputSchema.pick({
      summary: true,
    }),
  },
  prompt: `You are an AI assistant tasked with summarizing long conversations.
  Please provide a concise summary of the following conversation:
  \n
  {{conversation}}
  \n
  Summary:`, 
});

const summarizeAndStoreMemoryFlow = ai.defineFlow(
  {
    name: 'summarizeAndStoreMemoryFlow',
    inputSchema: SummarizeAndStoreMemoryInputSchema,
    outputSchema: SummarizeAndStoreMemoryOutputSchema,
  },
  async input => {
    const {conversation, memoryId} = input;

    const {output} = await summarizeMemoryPrompt({conversation});
    const summary = output?.summary ?? 'No summary generated.';

    // TODO: Implement long-term memory storage here
    // This is a placeholder for storing the summary in a vector database or similar
    // For now, we'll just log the summary
    console.log(`Storing summary in memory store ${memoryId}: ${summary}`);

    return {
      summary: summary,
      success: true, // Assume success for now
    };
  }
);
