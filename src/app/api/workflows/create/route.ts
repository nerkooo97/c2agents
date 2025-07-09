'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { WorkflowCreateAPISchema } from '@/lib/types';
import type { WorkflowDefinition } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const parseResult = WorkflowCreateAPISchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid workflow data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const workflowData = parseResult.data;

        // Check for existing workflow with the same name
        const existingWorkflow = await prisma.workflow.findUnique({
            where: { name: workflowData.name },
        });

        if (existingWorkflow) {
            return NextResponse.json({ error: `A workflow with the name '${workflowData.name}' already exists.` }, { status: 409 });
        }

        const newWorkflow = await prisma.workflow.create({
            data: {
                name: workflowData.name,
                description: workflowData.description,
                goal: workflowData.goal,
                planSteps: {
                    create: workflowData.planSteps.map((step, index) => ({
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

        // Map to client-side type
        const responseWorkflow: WorkflowDefinition = {
            ...newWorkflow,
            planSteps: newWorkflow.planSteps.map(s => ({ id: s.id, agentName: s.agentName, task: s.task })),
        };
        
        return NextResponse.json({ message: 'Workflow created successfully', workflow: responseWorkflow }, { status: 201 });

    } catch (e) {
        console.error('Error creating workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
