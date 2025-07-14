
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files were uploaded.' }, { status: 400 });
        }
        
        let count = 0;
        for (const file of files) {
            const content = await file.text();
            
            await db.knowledge.create({
                data: {
                    filename: file.name,
                    content,
                },
            });
            count++;
        }
        
        return NextResponse.json({ message: `${count} documents processed successfully.` }, { status: 201 });

    } catch (e) {
        console.error('Error uploading to knowledge base:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
