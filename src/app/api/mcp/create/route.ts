
'use server';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { McpServerFormSchema } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parseResult = McpServerFormSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid server data', details: parseResult.error.flatten() }, { status: 400 });
        }
        
        const newServer = await db.mcpServer.create({
            data: parseResult.data,
        });
        
        return NextResponse.json({ message: 'Server created successfully', server: newServer }, { status: 201 });

    } catch (e) {
        console.error('Error creating MCP server:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
