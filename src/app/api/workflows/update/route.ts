'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { WorkflowCreateAPISchema } from '@/lib/types';
import type { WorkflowDefinition } from '@/lib/types';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const UpdateSchema = z.object({
            originalId: z.string().cuid('Invalid workflow ID.'),
            workflowData: WorkflowCreateAPISchema,
        });
        
        const parseResult = UpdateSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const { originalId, workflowData } = parseResult.data;

        // Check if the new name is already taken by another workflow
        const conflictingWorkflow = await prisma.workflow.findUnique({
            where: { name: workflowData.name },
        });

        if (conflictingWorkflow && conflictingWorkflow.id !== originalId) {
            return NextResponse.json({ error: `A workflow with the name '${workflowData.name}' already exists.` }, { status: 409 });
        }

        const updatedWorkflow = await prisma.workflow.update({
            where: { id: originalId },
            data: {
                name: workflowData.name,
                description: workflowData.description,
                goal: workflowData.goal,
                planSteps: {
                    deleteMany: {}, // Delete all existing steps
                    create: workflowData.planSteps.map((step, index) => ({ // Create new ones
                        agentName: step.agentName,
                        task: step.task,
                        stepNumber: index + 1,
                    })),
                },
            },
            include: { 
                planSteps: {
                    orderBy: {
                        stepNumber: 'asc'
                    }
                } 
            },
        });
        
        const responseWorkflow: WorkflowDefinition = {
            ...updatedWorkflow,
            planSteps: updatedWorkflow.planSteps.map(s => ({ id: s.id, agentName: s.agentName, task: s.task })),
        };
        
        return NextResponse.json({ message: 'Workflow updated successfully', workflow: responseWorkflow });

    } catch (e) {
        console.error('Error updating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
