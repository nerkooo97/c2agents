'use server';
/**
 * @fileOverview Executes an agent with dynamic configuration.
 */
import { ai } from '@/ai/genkit';
import type { Tool } from 'genkit/tool';
import type { GenerateResponse, ModelReference } from 'genkit';

interface RunAgentConfig {
    systemPrompt: string;
    userInput: string;
    tools: Tool<any, any>[];
    model: string;
}

export async function runAgentWithConfig({ systemPrompt, userInput, tools, model }: RunAgentConfig): Promise<GenerateResponse> {
  const response = await ai.generate({
    model: model as ModelReference<any>,
    system: systemPrompt,
    prompt: userInput,
    tools: tools,
  });

  return response;
}
