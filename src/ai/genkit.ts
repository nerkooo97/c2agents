import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';
import { mcpClient } from 'genkitx-mcp';
import db from '@/lib/db';

async function initializeGenkit() {
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
    
    return genkit({ plugins });
}

// We use a promise to ensure genkit is initialized before being used.
const genkitInstance = initializeGenkit();

// We export a proxy object that will resolve to the initialized genkit instance.
// This allows other modules to import `ai` synchronously.
export const ai = new Proxy({}, {
    get: (_, prop) => {
        return async (...args: any[]) => {
            const instance = await genkitInstance;
            const method = (instance as any)[prop];
            if (typeof method === 'function') {
                return method.apply(instance, args);
            }
            return (instance as any)[prop];
        };
    },
}) as any; // Using `any` here is a pragmatic choice for the proxy.
