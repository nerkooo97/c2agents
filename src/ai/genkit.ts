import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';
import { mcpClient } from 'genkitx-mcp';
import { mcpServers } from '@/mcp-config';

// Start with base plugins
const plugins: GenkitPlugin[] = [googleAI(), openAI()];

// Dynamically create and add MCP client plugins
for (const name in mcpServers) {
    if (Object.prototype.hasOwnProperty.call(mcpServers, name)) {
        const config = mcpServers[name];
        const mcpPlugin = mcpClient({
            name: name,
            serverProcess: {
                command: config.command,
                args: config.args,
                env: config.env,
            },
        });
        plugins.push(mcpPlugin);
    }
}

export const ai = genkit({
  plugins,
});
