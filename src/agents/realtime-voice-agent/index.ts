import type { AgentDefinition } from '@/lib/types';

const agent: AgentDefinition = {
  name: 'Realtime Voice Agent',
  description: 'A voice-enabled agent for realtime conversations.',
  model: 'gemini-2.0-flash',
  systemPrompt: 'You are a voice assistant. Keep your responses concise and conversational.',
  defaultTask: 'Respond to the user voice input in a concise and conversational way.',
  tools: [],
  tags: ['voice', 'realtime'],
  enableApiAccess: true,
  realtime: true,
  enableMemory: true,
};

export default agent;
