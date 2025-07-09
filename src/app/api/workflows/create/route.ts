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
        const body = await request.json();
        
        const workflowId = sanitizeWorkflowId(body.name);
        if (!workflowId) {
            return NextResponse.json({ error: 'Invalid workflow name. It must contain alphanumeric characters.' }, { status: 400 });
        }
        
        const fullWorkflowData: WorkflowDefinition = {
            ...body,
            id: workflowId,
        };
        
        const parseResult = WorkflowDefinitionSchema.safeParse(fullWorkflowData);

        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const workflowData = parseResult.data;

        const filePath = path.join(workflowsDir, `${workflowId}.json`);

        try {
            await fs.access(filePath);
            return NextResponse.json({ error: `A workflow with a similar name ('${workflowId}') already exists.` }, { status: 409 });
        } catch (error) {
            // File doesn't exist, which is what we want.
        }

        await fs.mkdir(workflowsDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2), 'utf-8');
        
        return NextResponse.json({ message: 'Workflow created successfully', workflow: workflowData }, { status: 201 });

    } catch (e) {
        console.error('Error creating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
