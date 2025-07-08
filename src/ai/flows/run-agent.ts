'use server';
/**
 * @fileOverview Executes an agent with dynamic configuration.
 */
import { ai } from '@/ai/genkit';
import type { Tool } from 'genkit/tool';

interface RunAgentConfig {
    systemPrompt: string;
    userInput: string;
    tools: Tool<any, any>[];
}

export async function runAgentWithConfig({ systemPrompt, userInput, tools }: RunAgentConfig): Promise<string> {
  const response = await ai.generate({
    system: systemPrompt,
    prompt: userInput,
    tools: tools,
  });

  return response.text ?? 'I was unable to generate a response.';
}
