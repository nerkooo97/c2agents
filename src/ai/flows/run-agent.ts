'use server';
/**
 * @fileOverview Executes an agent with dynamic configuration.
 */
import { ai } from '@/ai/genkit';
import type { Tool } from 'genkit/tool';
import type { GenerateResponse, MessageData, ModelReference } from 'genkit';
import type { Message } from '@/lib/types';

interface RunAgentConfig {
    systemPrompt: string;
    userInput: string;
    tools: Tool<any, any>[];
    model: string;
    history?: Message[];
}

export async function runAgentWithConfig({ systemPrompt, userInput, tools, model, history }: RunAgentConfig): Promise<GenerateResponse> {
  const genkitHistory: MessageData[] | undefined = history?.map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content }],
  }));

  const response = await ai.generate({
    model: model as ModelReference<any>,
    system: systemPrompt,
    prompt: userInput,
    tools: tools,
    history: genkitHistory,
  });

  return response;
}
