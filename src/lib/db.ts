import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { WorkflowDefinition, PlanStep, WorkflowCreateAPISchema } from '@/lib/types';
import type { z } from 'zod';

const dbPath = path.join(process.cwd(), 'prisma', 'db.json');

interface DbData {
    workflows: WorkflowDefinition[];
}

async function readDb(): Promise<DbData> {
    try {
        await fs.access(dbPath);
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        // Handle empty file case
        if (!fileContent) {
            return { workflows: [] };
        }
        return JSON.parse(fileContent);
    } catch (error) {
        // If file doesn't exist or other error, initialize with empty data
        return { workflows: [] };
    }
}

async function writeDb(data: DbData): Promise<void> {
    try {
        await fs.mkdir(path.dirname(dbPath), { recursive: true });
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Failed to write to database file:", error);
        throw new Error("Could not save data to the database file.");
    }
}

type WorkflowCreateData = z.infer<typeof WorkflowCreateAPISchema>;

// This object mimics the Prisma Client API for minimal changes in API routes.
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

             if (index === -1) {
                 throw new Error('Workflow not found to update.');
             }

             const updatedWorkflow: WorkflowDefinition = {
                 id: args.where.id, // Keep original ID
                 name: args.data.name,
                 description: args.data.description,
                 goal: args.data.goal,
                 enableApiAccess: args.data.enableApiAccess,
                 planSteps: args.data.planSteps.map(step => ({
                    ...step,
                    // Assign new IDs to steps, or preserve old ones if they match
                    id: data.workflows[index].planSteps.find(s => s.agentName === step.agentName && s.task === step.task)?.id || crypto.randomUUID(),
                })),
             };

             data.workflows[index] = updatedWorkflow;
             await writeDb(data);
             return updatedWorkflow;
        },

        async delete(args: { where: { id: string } }): Promise<WorkflowDefinition> {
            const data = await readDb();
            const index = data.workflows.findIndex(w => w.id === args.where.id);
            if (index === -1) {
                throw new Error(`Record to delete not found.`);
            }
            const [deletedWorkflow] = data.workflows.splice(index, 1);
            await writeDb(data);
            return deletedWorkflow;
        }
    }
};

export default db;
