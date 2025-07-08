import type { AgentDefinition } from '@/lib/types';

const agent: AgentDefinition = {
  name: 'non-api-agent',
  description: 'An example of an agent not exposed via the API.',
  model: 'gemini-2.0-flash',
  systemPrompt: 'You are a document summarizer.',
  tools: [],
  tags: ['text', 'summarizer'],
  enableApiAccess: false,
  realtime: false,
};

export default agent;
