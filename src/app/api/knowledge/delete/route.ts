// This is a new file for the RAG Knowledge Base API.
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const DeleteSchema = z.object({
            id: z.string().uuid('Invalid Document ID provided.'),
        });
        
        const parseResult = DeleteSchema.safeParse(body);

        if (!parseResult.success) {
             return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
        }
        
        const { id } = parseResult.data;

        await db.knowledge.delete({
            where: { id },
        });
        
        return NextResponse.json({ message: 'Document deleted successfully.' });

    } catch (e) {
        console.error('Error deleting document:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';

        if (errorMessage.includes('Record to delete not found')) {
             return NextResponse.json({ message: `Document not found, nothing to delete.` }, { status: 404 });
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
