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
  constraints?: string;
  defaultTask?: string;
  tools: string[]; // Array of tool names
  tags?: string[]; // Optional tags for agent capabilities
  responseFormat: 'text' | 'json';
  enableApiAccess: boolean;
  realtime: boolean;
  enableMemory: boolean;
}

export const AgentDefinitionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.'),
  description: z.string().min(1, 'Description is required.'),
  systemPrompt: z.string().min(1, 'System prompt is required.'),
  constraints: z.string().optional(),
  defaultTask: z.string().optional(),
  model: z.string(),
  responseFormat: z.enum(['text', 'json']).default('text'),
  tools: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional().default([]),
  enableApiAccess: z.boolean().default(true),
  realtime: z.boolean().default(false),
  enableMemory: z.boolean().default(false),
});

export type AgentFormData = z.infer<typeof AgentDefinitionSchema>;

// Workflow Types

// This represents the shape of a PlanStep on the client-side.
// The `id` is used for React keys and is a UUID.
export interface PlanStep {
  id: string; // Changed from number to string (UUID)
  agentName: string;
  task: string;
}

// This represents a full workflow object, stored in the file-based DB.
// The `id` will be a CUID from the database.
export interface WorkflowDefinition {
  id: string; // Changed from number to string (UUID)
  name: string;
  description: string;
  goal: string;
  enableApiAccess: boolean;
  planSteps: PlanStep[];
}

// Zod schema for validating a plan step from the client.
export const PlanStepSchema = z.object({
  id: z.string(), // ID can be a placeholder string from the client
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


// Tool Builder Types
export const ToolDefinitionSchema = z.object({
  name: z.string().min(3, 'Tool name must be at least 3 characters.'),
  description: z.string().min(1, 'Description is required.'),
  inputSchema: z.string().min(1, 'Input schema (Zod) is required. e.g. z.object({ city: z.string() })'),
  functionBody: z.string().min(1, 'Tool function body is required. e.g. return `Weather in ${input.city} is sunny.`'),
});
export type ToolFormData = z.infer<typeof ToolDefinitionSchema>;


// Agent Analytics Types
export const AgentExecutionLogSchema = z.object({
  id: z.string().uuid(),
  agentName: z.string(),
  timestamp: z.string(),
  status: z.enum(['success', 'error']),
  inputTokens: z.number().optional().nullable(),
  outputTokens: z.number().optional().nullable(),
  totalTokens: z.number().optional().nullable(),
  errorDetails: z.string().optional().nullable(),
});
export type AgentExecutionLog = z.infer<typeof AgentExecutionLogSchema>;
