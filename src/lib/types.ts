import { z } from 'zod';

export interface Message {
  role: 'user' | 'model';
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
  defaultTask?: string;
  tools: string[]; // Array of tool names
  tags?: string[]; // Optional tags for agent capabilities
  enableApiAccess: boolean;
  realtime: boolean;
  enableMemory: boolean;
}

export const AgentDefinitionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  systemPrompt: z.string().min(1, 'System prompt is required.'),
  defaultTask: z.string().optional(),
  model: z.string(),
  tools: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional().default([]),
  enableApiAccess: z.boolean().default(true),
  realtime: z.boolean().default(false),
  enableMemory: z.boolean().default(false),
});

export type AgentFormData = z.infer<typeof AgentDefinitionSchema>;

export interface McpServerConfig {
  command: string;
  args: string[];
}

// Workflow Types

// This represents the shape of a PlanStep on the client-side.
// The `id` is used for React keys.
export interface PlanStep {
  id: string;
  agentName: string;
  task: string;
}

// This represents a full workflow object on the client-side.
// The `id` will be a CUID from the database.
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  goal: string;
  enableApiAccess: boolean;
  planSteps: PlanStep[];
}

// Zod schema for validating a plan step from the client.
// The client-side `id` is expected but not used in backend logic.
export const PlanStepSchema = z.object({
  id: z.string(),
  agentName: z.string().min(1, "Agent must be selected for each step."),
  task: z.string(), // Task will be populated from defaultTask before saving/running
});

// Zod schema for validating the data needed to create a new workflow.
export const WorkflowCreateAPISchema = z.object({
  name: z.string().min(3, 'Workflow name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  goal: z.string().min(1, 'Workflow goal is required.'),
  enableApiAccess: z.boolean().default(false),
  planSteps: z.array(PlanStepSchema).min(1, "At least one step is required."),
});

// Zod schema for the save/update form in the composer.
export const WorkflowMetadataSchema = z.object({
  name: z.string().min(3, 'Workflow name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  enableApiAccess: z.boolean().optional().default(false),
});
export type WorkflowFormData = z.infer<typeof WorkflowMetadataSchema>;
