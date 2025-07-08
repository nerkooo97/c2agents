import type { Tool } from 'genkit/tool';
import { toolMap } from '@/ai/tools';
import type { AgentDefinition, McpServerConfig } from '@/lib/types';

// Definition for Model Context Protocol (MCP) servers.
// In a real application, a separate process manager would be responsible for
// starting and stopping these servers based on this configuration.
export const mcpServers: Record<string, McpServerConfig> = {
  playwright: {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
  },
  customMcp: {
    command: 'node',
    args: ['./custom-mcp-server.js'],
  },
};

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
    name: 'Playwright Agent',
    description: 'An agent that can run Playwright scripts via an MCP server.',
    model: 'gemini-2.0-flash',
    systemPrompt:
      'You are a browser automation assistant. Use the playwright tool to execute scripts that users provide.',
    tools: ['playwright'],
    enableApiAccess: true,
    realtime: false,
  },
];

export const getAgent = (name: string): AgentDefinition | undefined => {
  return agents.find((agent) => agent.name === name);
};

// Helper to get full tool objects from names
export const getToolsForAgent = (agent: AgentDefinition): Tool<any, any>[] => {
  if (!agent.tools) return [];
  return agent.tools.map(toolName => toolMap[toolName]).filter(Boolean);
};
