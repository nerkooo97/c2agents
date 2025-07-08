import type { Tool } from 'genkit/tool';
import { calculator, webSearch } from '@/ai/tools';

export interface AgentDefinition {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: Tool<any, any>[];
  enableApiAccess: boolean;
  realtime: boolean;
}

export const agents: AgentDefinition[] = [
  {
    name: 'my-agent',
    description: 'A helpful AI assistant that can use tools to answer questions.',
    model: 'gemini-2.0-flash',
    systemPrompt:
      'You are a helpful AI assistant called MyAgent. You have access to a variety of tools to help answer user questions and complete tasks. When you use a tool, tell the user which tool you are using and what the result was.',
    tools: [calculator, webSearch],
    enableApiAccess: true,
    realtime: false,
  },
  {
    name: 'non-api-agent',
    description: 'An example of an agent not exposed via the API.',
    model: 'gemini-2.0-flash',
    systemPrompt: 'You are a document summarizer.',
    tools: [],
    enableApiAccess: false,
    realtime: false,
  },
  {
    name: 'Realtime Voice Agent',
    description: 'A voice-enabled agent for realtime conversations.',
    model: 'gemini-2.0-flash',
    systemPrompt: 'You are a voice assistant. Keep your responses concise and conversational.',
    tools: [],
    enableApiAccess: true,
    realtime: true,
  }
];

export const getAgent = (name: string): AgentDefinition | undefined => {
  return agents.find((agent) => agent.name === name);
};
