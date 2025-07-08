import type { Tool } from 'genkit/tool';
import { calculator, webSearch } from '@/ai/tools';

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  tools: Tool<any, any>[];
  enableApiAccess: boolean;
}

export const agents: AgentDefinition[] = [
  {
    name: 'my-agent',
    description: 'A helpful AI assistant that can use tools to answer questions.',
    systemPrompt:
      'You are a helpful AI assistant called MyAgent. You have access to a variety of tools to help answer user questions and complete tasks. When you use a tool, tell the user which tool you are using and what the result was.',
    tools: [calculator, webSearch],
    enableApiAccess: true,
  },
  {
    name: 'non-api-agent',
    description: 'An example of an agent not exposed via the API.',
    systemPrompt: 'You are a document summarizer.',
    tools: [],
    enableApiAccess: false,
  }
];

export const getAgent = (name: string): AgentDefinition | undefined => {
  return agents.find((agent) => agent.name === name);
};
