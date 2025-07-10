
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { McpServerFormSchema } from '@/lib/types';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const UpdateSchema = McpServerFormSchema.extend({
             id: z.string().uuid()
        });
        
        const parseResult = UpdateSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid server data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const { id, ...dataToUpdate } = parseResult.data;
        
        const updatedServer = await db.mcpServer.update({
            where: { id },
            data: dataToUpdate,
        });
        
        return NextResponse.json({ message: 'Server updated successfully', server: updatedServer });

    } catch (e) {
        console.error('Error updating server:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
