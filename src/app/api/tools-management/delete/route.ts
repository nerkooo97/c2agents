
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper to sanitize tool name
const sanitizeToolName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export async function POST(request: Request) {
    try {
        const { name } = await request.json() as { name: string };

        if (!name) {
            return NextResponse.json({ error: 'Plugin name is required.' }, { status: 400 });
        }
        
        const pluginFolderName = sanitizeToolName(name);
        const toolDir = path.join(process.cwd(), 'src', 'plugins', pluginFolderName);

        try {
            await fs.access(toolDir);
        } catch (error) {
            // If the folder doesn't exist, we can consider the deletion successful.
            return NextResponse.json({ message: `Plugin '${name}' not found, nothing to delete.` }, { status: 200 });
        }
        
        await fs.rm(toolDir, { recursive: true, force: true });
        
        return NextResponse.json({ message: `Plugin '${name}' deleted successfully.` });

    } catch (e) {
        console.error('Error deleting tool:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
