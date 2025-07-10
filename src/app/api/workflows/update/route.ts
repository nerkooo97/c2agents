'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { WorkflowCreateAPISchema } from '@/lib/types';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const UpdateRequestSchema = z.object({
            originalId: z.string().uuid('Invalid workflow ID.'),
            workflowData: WorkflowCreateAPISchema, // Use the correct schema here
        });
        
        // 1. Validate the raw incoming data first.
        const parseResult = UpdateRequestSchema.safeParse(body);
        if (!parseResult.success) {
            // Return detailed validation errors for better debugging
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const { originalId, workflowData } = parseResult.data;

        // Check if the new name is already taken by another workflow
        const conflictingWorkflow = await db.workflow.findFirst({
            where: { 
                name: workflowData.name,
                id: { not: originalId }
            },
        });

        if (conflictingWorkflow) {
            return NextResponse.json({ error: `A workflow with the name '${workflowData.name}' already exists.` }, { status: 409 });
        }

        // 2. Stringify the validated data for database storage.
        const updatedWorkflow = await db.workflow.update({
            where: { id: originalId },
            data: {
                ...workflowData,
                planSteps: JSON.stringify(workflowData.planSteps),
            }
        });
        
        return NextResponse.json({ message: 'Workflow updated successfully', workflow: updatedWorkflow });

    } catch (e) {
        console.error('Error updating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
