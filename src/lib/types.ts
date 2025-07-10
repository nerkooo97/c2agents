import { z } from 'zod';

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface Conversation {
  sessionId: string;
  messages: Message[];
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
  name:string;
  description: string;
  model: string;
  systemPrompt: string;
  constraints?: string;
  defaultTask?: string;
  tools: string[]; // Array of tool names provided by MCP servers
  tags?: string[]; // Optional tags for agent capabilities
  responseFormat: 'text' | 'json';
  enableApiAccess: boolean;
  realtime: boolean;
  enableMemory: boolean;
  icon?: string;
  iconColor?: string;
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
  icon: z.string().optional(),
  iconColor: z.string().optional(),
});

export type AgentFormData = z.infer<typeof AgentDefinitionSchema>;

// Workflow Types

export interface PlanStepNode {
  id: string;
  type: 'agent' | 'delay';
}

export interface AgentPlanStep extends PlanStepNode {
  type: 'agent';
  agentName: string;
  task: string;
}

export interface DelayPlanStep extends PlanStepNode {
  type: 'delay';
  delay: number; // in milliseconds
}

export type PlanStep = AgentPlanStep | DelayPlanStep;


// This represents a full workflow object, stored in the file-based DB.
export interface WorkflowDefinition {
  id: string; 
  name: string;
  description: string;
  goal: string;
  enableApiAccess: boolean;
  planSteps: PlanStep[];
}

// Zod schema for validating a plan step from the client.
export const AgentPlanStepSchema = z.object({
    id: z.string(),
    type: z.literal('agent'),
    agentName: z.string().min(1, "Agent must be selected for each step."),
    task: z.string(),
});

export const DelayPlanStepSchema = z.object({
    id: z.string(),
    type: z.literal('delay'),
    delay: z.number().min(0),
});

export const PlanStepSchema = z.discriminatedUnion('type', [
  AgentPlanStepSchema,
  DelayPlanStepSchema,
]);


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


// Agent Analytics Types
export const AgentExecutionLogSchema = z.object({
  id: z.string().uuid(),
  agentName: z.string(),
  timestamp: z.string(),
  status: z.enum(['success', 'error']),
  latency: z.number().optional().nullable(),
  inputTokens: z.number().optional().nullable(),
  outputTokens: z.number().optional().nullable(),
  totalTokens: z.number().optional().nullable(),
  errorDetails: z.string().optional().nullable(),
});
export type AgentExecutionLog = z.infer<typeof AgentExecutionLogSchema>;

// RAG / Knowledge Base Types
export interface KnowledgeDocument {
    id: string; // uuid
    filename: string;
    content: string;
    // In a real vector DB, you'd store embeddings here
    // embedding: number[]; 
}

// App Settings
export interface AppSettings {
    rag: {
        enabled: boolean;
        embeddingModel: string;
    };
    integrations?: Record<string, {
        installed: boolean;
        apiKey?: string;
    }>;
}

// ================== FILE-BASED TOOL MANAGEMENT TYPES ==================

// This is the definition of a tool as it is stored in its `index.ts` file.
export interface ToolDefinition {
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, any>;
  enabled: boolean;
}

// This is the schema used in the form for creating/editing a tool.
// It handles transformations from form-friendly formats (string) to the stored format (array/object).
const ToolEnvSchema = z.record(z.string(), z.any());

export const ToolFormSchema = z.object({
  name: z.string().min(1, 'Tool name is required.').regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, hyphens, and underscores.'),
  description: z.string().optional(),
  command: z.string().min(1, 'Command is required.'),
  // Transforms space-separated string of args into an array
  args: z.string().transform(val => val.split(' ').map(s => s.trim()).filter(Boolean)),
  // Transforms a JSON string into an object for env vars
  env: z.string().optional().transform(val => {
      if (!val) return {};
      try {
          const parsed = JSON.parse(val);
          if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
              return parsed;
          }
          throw new Error("Invalid JSON object");
      } catch(e) {
          throw new Error("Environment variables must be a valid JSON object.");
      }
  }).refine(data => ToolEnvSchema.safeParse(data).success, {
      message: "Invalid environment variable format."
  }),
  enabled: z.boolean().default(true),
});

export type ToolFormData = z.infer<typeof ToolFormSchema>;
