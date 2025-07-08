import type { Tool } from 'genkit/tool';
import { toolMap } from '@/ai/tools';
import type { AgentDefinition } from '@/lib/types';

export const agents: AgentDefinition[] = [
  {
    name: 'my-agent',
    description: 'A helpful AI assistant that can use tools to answer questions.',
    model: 'gemini-2.0-flash',
    systemPrompt:
      'You are a helpful AI assistant called MyAgent. You have access to a variety of tools to help answer user questions and complete tasks. When you use a tool, tell the user which tool you are using and what the result was.',
    tools: ['calculator', 'webSearch'],
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
  },
  {
    name: 'Context-Aware Agent',
    description: 'An agent that can fetch internal context before answering.',
    model: 'gemini-2.0-flash',
    systemPrompt:
      'You are a context-aware assistant. Before answering questions about projects, deadlines, or budgets, you must use the fetchModelContext tool to get the latest internal information. Only use other tools if the context is insufficient.',
    tools: ['fetchModelContext', 'webSearch'],
    enableApiAccess: true,
    realtime: false,
  }
];

export const getAgent = (name: string): AgentDefinition | undefined => {
  return agents.find((agent) => agent.name === name);
};

// Helper to get full tool objects from names
export const getToolsForAgent = (agent: AgentDefinition): Tool<any, any>[] => {
  if (!agent.tools) return [];
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
