// =================================================================================================
// DATABASE ADAPTER
// =================================================================================================
// This file acts as a flexible database adapter.
//
// By default, it uses a simple JSON file (`prisma/db.json`) for data storage, which is
// perfect for development and prototyping as it requires no external database setup.
//
// To switch to a production database (e.g., MySQL, Postgres), you would replace the logic
// in this file with your chosen database client (e.g., 'mysql2', 'pg') and implement
// the same data access functions to interact with your production database schema.
// =================================================================================================

import fs from 'fs/promises';
import path from 'path';
import type { WorkflowDefinition, AgentExecutionLog, Conversation, Message, PlanStep } from '@/lib/types';

const dbPath = path.join(process.cwd(), 'prisma', 'db.json');

interface DbData {
    workflows: WorkflowDefinition[];
    agentExecutionLogs: AgentExecutionLog[];
    conversations: Conversation[];
}

// Helper to read the database file
async function readDb(): Promise<DbData> {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data) as DbData;
    } catch (error) {
        // If the file doesn't exist, return a default structure
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { workflows: [], agentExecutionLogs: [], conversations: [] };
        }
        throw error;
    }
}

// Helper to write to the database file
async function writeDb(data: DbData): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}


// Mimicking Prisma Client API for minimal changes in the rest of the app

const db = {
    workflow: {
        async findMany(query?: { orderBy?: { [key: string]: 'asc' | 'desc' } }): Promise<WorkflowDefinition[]> {
            const data = await readDb();
            let workflows = [...data.workflows];
            if (query?.orderBy?.name === 'asc') {
                 workflows.sort((a, b) => a.name.localeCompare(b.name));
            }
             if (query?.orderBy?.createdAt === 'desc') {
                workflows.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            return workflows;
        },
        async findUnique(query: { where: { id: string } }): Promise<WorkflowDefinition | null> {
            const data = await readDb();
            return data.workflows.find(wf => wf.id === query.where.id) || null;
        },
        async findFirst(query: { where: { name: string, id?: { not: string } } }): Promise<WorkflowDefinition | null> {
            const data = await readDb();
             return data.workflows.find(wf => {
                const nameMatch = wf.name === query.where.name;
                if (query.where.id?.not) {
                    return nameMatch && wf.id !== query.where.id.not;
                }
                return nameMatch;
            }) || null;
        },
        async create(query: { data: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'> & {planSteps: string} }): Promise<WorkflowDefinition> {
            const data = await readDb();
            const newWorkflow: WorkflowDefinition = {
                id: crypto.randomUUID(),
                ...query.data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            data.workflows.push(newWorkflow);
            await writeDb(data);
            return newWorkflow;
        },
         async update(query: { where: { id: string }, data: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'> & {planSteps: string} }): Promise<WorkflowDefinition> {
            const data = await readDb();
            const index = data.workflows.findIndex(wf => wf.id === query.where.id);
            if (index === -1) {
                throw new Error('Record to update not found.');
            }
            const updatedWorkflow = {
                ...data.workflows[index],
                ...query.data,
                updatedAt: new Date(),
            };
            data.workflows[index] = updatedWorkflow;
            await writeDb(data);
            return updatedWorkflow;
        },
         async delete(query: { where: { id: string } }): Promise<void> {
            const data = await readDb();
            const initialLength = data.workflows.length;
            data.workflows = data.workflows.filter(wf => wf.id !== query.where.id);
            if (data.workflows.length === initialLength) {
                 throw new Error('Record to delete not found.');
            }
            await writeDb(data);
        },
    },
    agentExecutionLog: {
        async findMany(query?: { where?: { agentName: string }, orderBy?: { timestamp: 'desc' } }): Promise<AgentExecutionLog[]> {
            const data = await readDb();
            let logs = data.agentExecutionLogs;

            if (query?.where?.agentName) {
                logs = logs.filter(log => log.agentName === query.where.agentName);
            }

            if (query?.orderBy?.timestamp === 'desc') {
                logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }

            return logs;
        },
        async create(query: { data: Omit<AgentExecutionLog, 'id' | 'timestamp'> }): Promise<void> {
            const data = await readDb();
            const newLog: AgentExecutionLog = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                ...query.data,
            };
            data.agentExecutionLogs.push(newLog);
            await writeDb(data);
        },
    },
    conversation: {
        async findUnique(query: { where: { sessionId: string } }): Promise<Conversation | null> {
            const data = await readDb();
            return data.conversations.find(c => c.sessionId === query.where.sessionId) || null;
        },
        async upsert(query: { where: { sessionId: string }, create: { sessionId: string, messages: string }, update: { messages: string } }): Promise<void> {
            const data = await readDb();
            const index = data.conversations.findIndex(c => c.sessionId === query.where.sessionId);
            if (index !== -1) { // Update
                data.conversations[index].messages = query.update.messages;
                data.conversations[index].updatedAt = new Date();
            } else { // Create
                const newConversation: Conversation = {
                    sessionId: query.create.sessionId,
                    messages: query.create.messages,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                data.conversations.push(newConversation);
            }
            await writeDb(data);
        },
    },
    knowledge: {
        async findMany(query?: { orderBy?: { createdAt: 'desc' } }): Promise<any[]> {
             const data = await readDb();
             let docs = (data as any).knowledge || [];
             if (query?.orderBy?.createdAt === 'desc') {
                docs.sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            return docs;
        },
        async create(query: { data: { filename: string, content: string } }): Promise<void> {
             let data = await readDb() as any;
             if (!data.knowledge) data.knowledge = [];
             const newDoc = {
                id: crypto.randomUUID(),
                createdAt: new Date(),
                ...query.data
             };
             data.knowledge.push(newDoc);
             await writeDb(data);
        },
        async delete(query: { where: { id: string } }): Promise<void> {
             let data = await readDb() as any;
             if (!data.knowledge) return;
             
             const initialLength = data.knowledge.length;
             data.knowledge = data.knowledge.filter((d: any) => d.id !== query.where.id);

             if (data.knowledge.length === initialLength) {
                 throw new Error('Record to delete not found.');
             }
             await writeDb(data);
        }
    }
};

export default db;
