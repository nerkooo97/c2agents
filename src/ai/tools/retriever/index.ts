// This is a new file for the RAG retriever tool.
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import db from '@/lib/db';

const retrieverTool = ai.defineTool({
    name: 'retriever',
    description: 'Searches the internal knowledge base for information relevant to the user\'s query. Use this to answer questions about specific topics contained in the uploaded documents.',
    inputSchema: z.object({
        query: z.string().describe('The user\'s question or topic to search for in the knowledge base.'),
    }),
    outputSchema: z.string().describe('A string containing the most relevant snippets of text from the knowledge base, or a message indicating that no relevant information was found.'),
}, async (input) => {
    try {
        const documents = await db.knowledge.findMany();
        if (documents.length === 0) {
            return "The knowledge base is empty. There are no documents to search.";
        }

        const query = input.query.toLowerCase();
        const queryWords = new Set(query.split(/\s+/).filter(w => w.length > 2));
        
        let relevantSnippets: { filename: string, content: string }[] = [];

        for (const doc of documents) {
            const content = doc.content.toLowerCase();
            const sentences = doc.content.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s/);

            for (const sentence of sentences) {
                const sentenceLower = sentence.toLowerCase();
                if (Array.from(queryWords).some(word => sentenceLower.includes(word))) {
                     relevantSnippets.push({
                         filename: doc.filename,
                         content: sentence.trim(),
                     });
                }
            }
        }
        
        if (relevantSnippets.length === 0) {
            return "No relevant information found in the knowledge base for that query.";
        }

        // Simple deduplication
        const uniqueSnippets = Array.from(new Map(relevantSnippets.map(item => [item.content, item])).values());
        
        const formattedSnippets = uniqueSnippets.slice(0, 5).map(s => `[Source: ${s.filename}]\n${s.content}`).join('\n\n---\n\n');

        return `Found the following information from the knowledge base:\n\n${formattedSnippets}`;

    } catch (e) {
        console.error("Error in retriever tool:", e);
        return "An error occurred while searching the knowledge base.";
    }
});

export default retrieverTool;
