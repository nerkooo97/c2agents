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
    // In a real implementation, settings would be fetched from a secure store.
    // Here, we simulate checking if the RAG system is enabled.
    // The actual settings are applied on the client for this demo, but this check simulates a backend gate.
    
    try {
        const documents = await db.knowledge.findMany();
        if (documents.length === 0) {
            return "The knowledge base is empty. There are no documents to search.";
        }

        // Simple keyword matching for demonstration purposes.
        // A real RAG system would use vector embeddings for semantic search.
        const query = input.query.toLowerCase();
        const queryWords = new Set(query.split(/\s+/).filter(w => w.length > 2));
        
        let relevantSnippets: { filename: string, content: string }[] = [];

        for (const doc of documents) {
            const content = doc.content.toLowerCase();
            // Simple sentence splitting
            const sentences = doc.content.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s/);

            for (const sentence of sentences) {
                const sentenceLower = sentence.toLowerCase();
                // Check if any query word is in the sentence
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
        
        // Format the output
        const formattedSnippets = uniqueSnippets.slice(0, 5).map(s => `[Source: ${s.filename}]\n${s.content}`).join('\n\n---\n\n');

        return `Found the following information from the knowledge base:\n\n${formattedSnippets}`;

    } catch (e) {
        console.error("Error in retriever tool:", e);
        return "An error occurred while searching the knowledge base.";
    }
});

export default retrieverTool;
