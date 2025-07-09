import type { AgentDefinition } from '@/lib/types';

const agent: AgentDefinition = {
  name: 'Playwright Agent',
  description: 'An agent that can run Playwright scripts via an MCP server.',
  model: 'gemini-2.0-flash',
  systemPrompt:
    'You are a browser automation assistant. Use the playwright tool to execute scripts that users provide.',
  defaultTask: 'Execute the provided Playwright script to automate browser actions.',
  tools: ['playwright'],
  tags: ['automation', 'browser'],
  enableApiAccess: true,
  realtime: false,
  enableMemory: false,
};

export default agent;
