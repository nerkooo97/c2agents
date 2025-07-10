
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { McpServerFormSchema } from '@/lib/types';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const UpdateRequestSchema = z.object({
             id: z.string().uuid(),
             name: z.string().min(1, 'Server name is required.'),
             description: z.string().optional(),
             command: z.string().min(1, 'Command is required.'),
             args: z.string(),
             env: z.string().optional(),
             enabled: z.boolean(),
        });

        const requestParseResult = UpdateRequestSchema.safeParse(body);
         if (!requestParseResult.success) {
            return NextResponse.json({ error: 'Invalid request format', details: requestParseResult.error.flatten() }, { status: 400 });
        }
        
        const { id, ...formData } = requestParseResult.data;

        // Reparse with the schema that includes transformations
        const formParseResult = McpServerFormSchema.safeParse(formData);
        if (!formParseResult.success) {
            return NextResponse.json({ error: 'Invalid server data', details: formParseResult.error.flatten() }, { status: 400 });
        }
        
        const updatedServer = await db.mcpServer.update({
            where: { id },
            data: formParseResult.data,
        });
        
        return NextResponse.json({ message: 'Server updated successfully', server: updatedServer });

    } catch (e) {
        console.error('Error updating server:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
