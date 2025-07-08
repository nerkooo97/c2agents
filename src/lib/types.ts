import { z } from 'zod';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExecutionStep {
  type: 'prompt' | 'memory' | 'tool' | 'response';
  title: string;
  content: string;
  toolName?: string;
  toolInput?: string;
}

export interface AgentInfo {
  name: string;
  description: string;
  model: string;
  toolsCount: number;
  apiAccess: boolean;
  realtime: boolean;
}

export interface AgentDefinition {
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  tools: string[]; // Array of tool names
  enableApiAccess: boolean;
  realtime: boolean;
}

export const AgentDefinitionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  systemPrompt: z.string().min(1, 'System prompt is required.'),
  model: z.string(),
  tools: z.array(z.string()).default([]),
  enableApiAccess: z.boolean().default(true),
  realtime: z.boolean().default(false),
});

export type AgentFormData = z.infer<typeof AgentDefinitionSchema>;

export interface McpServerConfig {
  command: string;
  args: string[];
}
