import type { AgentDefinition } from '@/lib/types';

const agent: AgentDefinition = {
  name: 'Realtime Voice Agent',
  description: 'A voice-enabled agent for realtime conversations.',
  model: 'gemini-2.0-flash',
  systemPrompt: 'You are a voice assistant. Keep your responses concise and conversational.',
  tools: [],
  tags: ['voice', 'realtime'],
  enableApiAccess: true,
  realtime: true,
};

export default agent;
