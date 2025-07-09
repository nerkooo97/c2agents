'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { WorkflowDefinition } from '@/lib/types';
import { WorkflowDefinitionSchema } from '@/lib/types';

const sanitizeWorkflowId = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const workflowsDir = path.join(process.cwd(), 'src', 'workflows');

export async function POST(request: Request) {
    try {
        const { originalId, workflowData: body } = await request.json() as { originalId: string, workflowData: Omit<WorkflowDefinition, 'id'> };
        
        const newId = sanitizeWorkflowId(body.name);
         if (!newId) {
            return NextResponse.json({ error: 'Invalid workflow name. It must contain alphanumeric characters.' }, { status: 400 });
        }

        const fullWorkflowData: WorkflowDefinition = { ...body, id: newId };
        
        const parseResult = WorkflowDefinitionSchema.safeParse(fullWorkflowData);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const workflowData = parseResult.data;
        const originalFilePath = path.join(workflowsDir, `${originalId}.json`);
        const newFilePath = path.join(workflowsDir, `${newId}.json`);

        try {
            await fs.access(originalFilePath);
        } catch (error) {
            return NextResponse.json({ error: `Workflow with original id '${originalId}' not found.` }, { status: 404 });
        }

        if (originalId !== newId) {
            try {
                await fs.access(newFilePath);
                return NextResponse.json({ error: `A workflow with the new name '${body.name}' already exists.` }, { status: 409 });
            } catch (error) {
                // New name is available, so we can proceed.
                await fs.rm(originalFilePath);
            }
        }
        
        await fs.writeFile(newFilePath, JSON.stringify(workflowData, null, 2), 'utf-8');
        
        return NextResponse.json({ message: 'Workflow updated successfully', workflow: workflowData });

    } catch (e) {
        console.error('Error updating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
