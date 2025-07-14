'use server';
/**
 * @fileOverview Executes an agent with dynamic configuration.
 */
import { ai } from '@/ai/genkit';
import type { Tool } from 'genkit/tool';
import type { GenerateResponse, MessageData, ModelReference } from 'genkit';
import type { Message } from '@/lib/types';
import { runInAction } from 'genkit';

interface RunAgentConfig {
    systemPrompt: string;
    constraints?: string;
    responseFormat?: 'text' | 'json';
    userInput: string;
    tools: Tool<any, any>[];
    model: string;
    history?: Message[];
    traceId?: string; // Add traceId to manage stateful tools like the browser
}

export async function runAgentWithConfig({ 
    systemPrompt, 
    constraints, 
    responseFormat, 
    userInput, 
    tools, 
    model, 
    history,
    traceId,
}: RunAgentConfig): Promise<GenerateResponse> {

  const genkitHistory: MessageData[] | undefined = history?.map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content }],
  }));

  let fullSystemPrompt = systemPrompt;
  if (constraints) {
    fullSystemPrompt += `\n\n## CONSTRAINTS\nThe user has provided the following constraints that you MUST follow:\n${constraints}`;
  }

  if (responseFormat === 'json') {
      fullSystemPrompt += `\n\n## RESPONSE FORMAT\nYou MUST provide your final response in a valid JSON format. Do not include any explanatory text before or after the JSON object.`;
  }

  const response = await ai.generate({
    model: model as ModelReference<any>,
    system: fullSystemPrompt,
    prompt: userInput,
    tools: tools,
    history: genkitHistory,
    config: {
        responseFormat: responseFormat,
    },
    // Pass the traceId to the context of the tool execution environment
    context: traceId ? { traceId } : undefined,
  });

  return response;
}
