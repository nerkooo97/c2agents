import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';
import { mcpClient } from 'genkitx-mcp';
import db from '@/lib/db';

const plugins: GenkitPlugin[] = [googleAI(), openAI()];

try {
    const mcpServers = await db.mcpServer.findMany();
    const enabledServers = mcpServers.filter(s => s.enabled);

    for (const server of enabledServers) {
        const mcpPlugin = mcpClient({
            name: server.name,
            serverProcess: {
                command: server.command,
                args: server.args,
                env: server.env,
            },
        });
        plugins.push(mcpPlugin);
    }
} catch (error) {
    console.error("Failed to load MCP servers from database, continuing without them.", error);
}

export const ai = genkit({ plugins });
