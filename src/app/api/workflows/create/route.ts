

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { WorkflowCreateAPISchema } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parseResult = WorkflowCreateAPISchema.safeParse(body);

        if (!parseResult.success) {
            console.error('Server: Zod validation failed!', parseResult.error.flatten());
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const workflowData = parseResult.data;

        const existingWorkflow = await db.workflow.findFirst({
            where: { name: workflowData.name },
        });

        if (existingWorkflow) {
            return NextResponse.json({ error: `A workflow with the name '${workflowData.name}' already exists.` }, { status: 409 });
        }

        const newWorkflow = await db.workflow.create({
            data: {
                ...workflowData,
                nodes: JSON.stringify(workflowData.nodes),
                edges: JSON.stringify(workflowData.edges),
            }
        });
        
        return NextResponse.json({ message: 'Workflow created successfully', workflow: newWorkflow }, { status: 201 });

    } catch (e) {
        console.error('Error creating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
