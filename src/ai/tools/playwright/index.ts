import {ai} from '@/ai/genkit';
import {z} from 'zod';

const playwrightTool = ai.defineTool({
    name: 'playwright',
    description: 'Runs Playwright commands via an MCP server to automate browser actions.',
    inputSchema: z.object({
        script: z.string().describe('The Playwright script to execute.'),
    }),
    outputSchema: z.string().describe('The result from the Playwright script execution.'),
}, async (input) => {
    // This function communicates with a running MCP server process.
    // You must start this server separately by running `npm run mcp:playwright` in another terminal.
    const mcpServerUrl = 'http://localhost:6543'; // Default Playwright MCP server port

    console.log(`Calling Playwright MCP server at ${mcpServerUrl} with script: ${input.script}`);

    try {
        const response = await fetch(mcpServerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // The exact payload structure depends on the MCP server's implementation.
                // This is a common pattern.
                script: input.script,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP server returned an error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        
        // The exact response structure depends on the MCP server.
        // We'll assume it returns a result in a 'result' or 'output' field.
        return JSON.stringify(result.output || result.result || result);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`Failed to connect to Playwright MCP server: ${errorMessage}`);
        return `Error: Could not connect to the Playwright MCP server at ${mcpServerUrl}. Is it running?`;
    }
});

export default playwrightTool;
