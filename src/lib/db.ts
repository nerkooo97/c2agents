// =================================================================================================
// IMPORTANT: DATABASE ADAPTER
// =================================================================================================
// This file acts as a flexible database adapter.
//
// By default, it uses a simple JSON file (`prisma/db.json`) for data storage, which is
// perfect for development and prototyping as it requires no external database setup.
//
// =================================================================================================


// =================================================================================================
// JSON FILE DATABASE IMPLEMENTATION (Default for Development)
// =================================================================================================
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { WorkflowDefinition, AgentExecutionLog, Message, Conversation, KnowledgeDocument, AppSettings } from '@/lib/types';
import { z } from 'zod';
import { WorkflowCreateAPISchema } from '@/lib/types';

const dbPath = path.join(process.cwd(), 'prisma', 'db.json');

interface DbData {
    workflows: WorkflowDefinition[];
    agentExecutionLogs: AgentExecutionLog[];
    conversations: Conversation[];
    knowledge: KnowledgeDocument[];
    settings?: AppSettings;
}

const initialDbData: DbData = {
  workflows: [],
  agentExecutionLogs: [],
  conversations: [],
  knowledge: [],
  settings: undefined,
};

async function writeDb(data: DbData): Promise<void> {
    try {
        await fs.mkdir(path.dirname(dbPath), { recursive: true });
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Failed to write to database file:", error);
        throw new Error("Could not save data to the database file.");
    }
}

async function readDb(): Promise<DbData> {
    try {
        await fs.access(dbPath);
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        if (!fileContent) {
            await writeDb(initialDbData);
            return { ...initialDbData };
        }
        const data = JSON.parse(fileContent);
        // Ensure all expected keys exist, merge with initial data
        const completeData = {
            ...initialDbData,
            ...data,
        };
        return completeData;
    } catch (error) {
        // If file doesn't exist or is corrupted, create it with initial data.
        await writeDb(initialDbData);
        return { ...initialDbData };
    }
}


type WorkflowCreateData = z.infer<typeof WorkflowCreateAPISchema>;
type AgentExecutionLogCreateData = Omit<AgentExecutionLog, 'id' | 'timestamp'>;
type KnowledgeCreateData = Omit<KnowledgeDocument, 'id'>;

const db = {
    workflow: {
        async findMany(args?: { orderBy?: { name?: 'asc' | 'desc' } }): Promise<WorkflowDefinition[]> {
            const data = await readDb();
            let workflows = [...data.workflows];
            if (args?.orderBy?.name === 'asc') {
                workflows.sort((a, b) => a.name.localeCompare(b.name));
            } else if (args?.orderBy?.name === 'desc') {
                workflows.sort((a, b) => b.name.localeCompare(a.name));
            }
            return workflows;
        },
        async findUnique(args: { where: { id?: string; name?: string } }): Promise<WorkflowDefinition | null> {
            const data = await readDb();
            const workflow = data.workflows.find(w => 
                (args.where.id && w.id === args.where.id) ||
                (args.where.name && w.name === args.where.name)
            );
            return workflow || null;
        },
        async create(args: { data: WorkflowCreateData }): Promise<WorkflowDefinition> {
            const data = await readDb();
            const newWorkflow: WorkflowDefinition = {
                id: crypto.randomUUID(),
                name: args.data.name,
                description: args.data.description,
                goal: args.data.goal,
                enableApiAccess: args.data.enableApiAccess,
                planSteps: args.data.planSteps.map(step => ({
                    ...step,
                    id: crypto.randomUUID(),
                })),
            };
            data.workflows.push(newWorkflow);
            await writeDb(data);
            return newWorkflow;
        },
        async update(args: { where: { id: string }, data: WorkflowCreateData }): Promise<WorkflowDefinition> {
             const data = await readDb();
             const index = data.workflows.findIndex(w => w.id === args.where.id);
             if (index === -1) throw new Error('Workflow not found to update.');
             const updatedWorkflow: WorkflowDefinition = {
                 ...args.data,
                 id: args.where.id,
                 planSteps: args.data.planSteps.map(step => ({
                    ...step,
                    id: step.id || crypto.randomUUID(),
                })),
             };
             data.workflows[index] = updatedWorkflow;
             await writeDb(data);
             return updatedWorkflow;
        },
        async delete(args: { where: { id: string } }): Promise<WorkflowDefinition> {
            const data = await readDb();
            const index = data.workflows.findIndex(w => w.id === args.where.id);
            if (index === -1) throw new Error(`Record to delete not found.`);
            const [deletedWorkflow] = data.workflows.splice(index, 1);
            await writeDb(data);
            return deletedWorkflow;
        }
    },
    agentExecutionLog: {
        async findMany(args?: { where?: { agentName?: string }; orderBy?: { timestamp?: 'asc' | 'desc' } }): Promise<AgentExecutionLog[]> {
            const data = await readDb();
            let logs = data.agentExecutionLogs;
            if (args?.where?.agentName) {
                logs = logs.filter(log => log.agentName === args.where.agentName);
            }
            if (args?.orderBy?.timestamp === 'desc') {
                logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            } else if (args?.orderBy?.timestamp === 'asc') {
                 logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            }
            return logs;
        },
        async create(args: { data: AgentExecutionLogCreateData }): Promise<AgentExecutionLog> {
            const data = await readDb();
            const newLog: AgentExecutionLog = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                ...args.data,
            };
            data.agentExecutionLogs.push(newLog);
            await writeDb(data);
            return newLog;
        }
    },
    conversation: {
        async findUnique(args: { where: { sessionId: string } }): Promise<Conversation | null> {
            const data = await readDb();
            const conversation = data.conversations.find(c => c.sessionId === args.where.sessionId);
            return conversation || null;
        },
        async create(args: { data: { sessionId: string; messages: Message[] } }): Promise<Conversation> {
            const data = await readDb();
            const newConversation: Conversation = {
                ...args.data,
            };
            data.conversations.push(newConversation);
            await writeDb(data);
            return newConversation;
        },
        async update(args: { where: { sessionId: string }, data: { messages: Message[] } }): Promise<Conversation> {
            const data = await readDb();
            const index = data.conversations.findIndex(c => c.sessionId === args.where.sessionId);
            if (index === -1) throw new Error('Conversation not found to update.');
            data.conversations[index].messages = args.data.messages;
            await writeDb(data);
            return data.conversations[index];
        }
    },
    knowledge: {
        async findMany(): Promise<KnowledgeDocument[]> {
            const db = await readDb();
            return db.knowledge;
        },
        async create(args: { data: KnowledgeCreateData }): Promise<KnowledgeDocument> {
            const db = await readDb();
            const newDoc: KnowledgeDocument = {
                id: crypto.randomUUID(),
                ...args.data,
            };
            db.knowledge.push(newDoc);
            await writeDb(db);
            return newDoc;
        },
        async delete(args: { where: { id: string } }): Promise<KnowledgeDocument> {
            const db = await readDb();
            const index = db.knowledge.findIndex(d => d.id === args.where.id);
            if (index === -1) {
                throw new Error('Record to delete not found.');
            }
            const [deletedDoc] = db.knowledge.splice(index, 1);
            await writeDb(db);
            return deletedDoc;
        }
    },
    settings: {
        async findFirst(): Promise<AppSettings | null> {
            const data = await readDb();
            return data.settings || null;
        },
        async upsert(args: { create: AppSettings; update: AppSettings }): Promise<AppSettings> {
            const data = await readDb();
            const newSettings = { ...data.settings, ...args.update };
            data.settings = newSettings;
            await writeDb(data);
            return newSettings;
        },
    },
};

export default db;

/*
// =================================================================================================
// PRISMA CLIENT IMPLEMENTATION (For Production with MySQL/Postgres/etc.)
// =================================================================================================
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const db = globalThis.prisma ?? prismaClientSingleton()

export default db
*/
