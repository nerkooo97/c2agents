

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { WorkflowCreateAPISchema } from '@/lib/types';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const UpdateRequestSchema = z.object({
            originalId: z.string().uuid('Invalid workflow ID.'),
            workflowData: WorkflowCreateAPISchema,
        });
        
        const parseResult = UpdateRequestSchema.safeParse(body);
        if (!parseResult.success) {
            console.error('Server: Zod validation failed on update!', parseResult.error.flatten());
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const { originalId, workflowData } = parseResult.data;

        const conflictingWorkflow = await db.workflow.findFirst({
            where: { 
                name: workflowData.name,
                id: { not: originalId }
            },
        });

        if (conflictingWorkflow) {
            return NextResponse.json({ error: `A workflow with the name '${workflowData.name}' already exists.` }, { status: 409 });
        }

        const updatedWorkflow = await db.workflow.update({
            where: { id: originalId },
            data: {
                ...workflowData,
                nodes: JSON.stringify(workflowData.nodes),
                edges: JSON.stringify(workflowData.edges),
            }
        });
        
        return NextResponse.json({ message: 'Workflow updated successfully', workflow: updatedWorkflow });

    } catch (e) {
        console.error('Error updating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
