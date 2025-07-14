

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper to sanitize agent name
const sanitizeAgentName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export async function POST(request: Request) {
    try {
        const { name } = await request.json() as { name: string };

        if (!name) {
            return NextResponse.json({ error: 'Agent name is required.' }, { status: 400 });
        }
        
        const agentFolderName = sanitizeAgentName(name);
        const agentDir = path.join(process.cwd(), 'src', 'agents', agentFolderName);

        try {
            await fs.access(agentDir);
        } catch (error) {
            // If the folder doesn't exist, we can consider the deletion successful.
            return NextResponse.json({ message: `Agent '${name}' not found, nothing to delete.` }, { status: 200 });
        }
        
        await fs.rm(agentDir, { recursive: true, force: true });
        
        return NextResponse.json({ message: `Agent '${name}' deleted successfully.` });

    } catch (e) {
        console.error('Error deleting agent:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
