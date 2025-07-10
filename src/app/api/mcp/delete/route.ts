
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const DeleteSchema = z.object({ id: z.string().uuid() });
        const parseResult = DeleteSchema.safeParse(body);

        if (!parseResult.success) {
             return NextResponse.json({ error: 'Valid server ID is required.' }, { status: 400 });
        }
        
        await db.mcpServer.delete({ where: { id: parseResult.data.id } });
        
        return NextResponse.json({ message: 'Server deleted successfully.' });
    } catch (e) {
        console.error('Error deleting server:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
