'use server';

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const workflowsDir = path.join(process.cwd(), 'src', 'workflows');

export async function POST(request: Request) {
    try {
        const { id } = await request.json() as { id: string };

        if (!id) {
            return NextResponse.json({ error: 'Workflow ID is required.' }, { status: 400 });
        }
        
        const filePath = path.join(workflowsDir, `${id}.json`);

        try {
            await fs.access(filePath);
        } catch (error) {
            return NextResponse.json({ message: `Workflow '${id}' not found, nothing to delete.` }, { status: 200 });
        }
        
        await fs.rm(filePath);
        
        return NextResponse.json({ message: `Workflow '${id}' deleted successfully.` });

    } catch (e) {
        console.error('Error deleting workflow:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
