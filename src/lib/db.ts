// =================================================================================================
// IMPORTANT: DATABASE ADAPTER
// =================================================================================================
// This file acts as a flexible database adapter.
//
// By default, it uses a simple JSON file (`prisma/db.json`) for data storage, which is
// perfect for development and prototyping as it requires no external database setup.
//
// When you are ready to move to a production environment with a real database like MySQL,
// you can easily switch the implementation without changing any other part of your application code.
//
// HOW TO SWITCH TO PRISMA WITH MYSQL:
// ------------------------------------
// 1. CONFIGURE YOUR DATABASE URL:
//    Open the `prisma/schema.prisma` file and update the `url` in the `datasource` block
//    with your MySQL connection string. It's best to use an environment variable.
//
// 2. RUN DATABASE MIGRATION:
//    In your terminal, run the command `npx prisma db push`. This will create the
//    necessary tables (`Workflow`, `PlanStep`) in your MySQL database based on the schema.
//
// 3. SWAP THE CODE BELOW:
//    - Comment out or delete the "JSON FILE DATABASE IMPLEMENTATION" section.
//    - Uncomment the "PRISMA CLIENT IMPLEMENTATION" section.
//
// That's it! Your application will now use MySQL via Prisma.
// =================================================================================================


// =================================================================================================
// JSON FILE DATABASE IMPLEMENTATION (Default for Development)
// =================================================================================================
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { WorkflowDefinition, WorkflowCreateAPISchema } from '@/lib/types';
import type { z } from 'zod';

const dbPath = path.join(process.cwd(), 'prisma', 'db.json');

interface DbData {
    workflows: WorkflowDefinition[];
}

async function readDb(): Promise<DbData> {
    try {
        await fs.access(dbPath);
        const fileContent = await fs.readFile(dbPath, 'utf-8');
        if (!fileContent) return { workflows: [] };
        return JSON.parse(fileContent);
    } catch (error) {
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
    }
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

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db
*/
