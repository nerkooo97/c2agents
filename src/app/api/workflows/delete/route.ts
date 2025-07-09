'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const DeleteSchema = z.object({
            id: z.string().cuid('Invalid Workflow ID provided.'),
        });
        
        const parseResult = DeleteSchema.safeParse(body);

        if (!parseResult.success) {
             return NextResponse.json({ error: 'Workflow ID is required.' }, { status: 400 });
        }
        
        const { id } = parseResult.data;

        await prisma.workflow.delete({
            where: { id },
        });
        
        return NextResponse.json({ message: `Workflow deleted successfully.` });

    } catch (e) {
        console.error('Error deleting workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        // Handle cases where the record to delete is not found
        if ((e as any).code === 'P2025') {
             return NextResponse.json({ message: `Workflow not found, nothing to delete.` }, { status: 404 });
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
