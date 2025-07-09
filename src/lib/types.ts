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
  tags?: string[]; // Optional tags for agent capabilities
  enableApiAccess: boolean;
  realtime: boolean;
}

export const AgentDefinitionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  systemPrompt: z.string().min(1, 'System prompt is required.'),
  model: z.string(),
  tools: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional().default([]),
  enableApiAccess: z.boolean().default(true),
  realtime: z.boolean().default(false),
});

export type AgentFormData = z.infer<typeof AgentDefinitionSchema>;

export interface McpServerConfig {
  command: string;
  args: string[];
}

export interface PlanStep {
  id: string;
  agentName: string;
  task: string;
}


// Workflow Types
export const PlanStepSchema = z.object({
  id: z.string(),
  agentName: z.string().min(1, "Agent must be selected for each step."),
  task: z.string().min(1, "Task description is required for each step."),
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1, 'ID is required.'),
  name: z.string().min(3, 'Workflow name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  goal: z.string().min(1, 'Workflow goal is required.'),
  planSteps: z.array(PlanStepSchema).min(1, "At least one step is required."),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowMetadataSchema = WorkflowDefinitionSchema.pick({
  name: true,
  description: true,
});
export type WorkflowFormData = z.infer<typeof WorkflowMetadataSchema>;
