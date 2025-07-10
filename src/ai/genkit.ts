import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';
import { mcpClient } from 'genkitx-mcp';
import { loadTools } from '@/lib/tools-registry';

const plugins: GenkitPlugin[] = [googleAI(), openAI()];

const toolConfigs = await loadTools();
const enabledTools = toolConfigs.filter(t => t.enabled);

for (const tool of enabledTools) {
    const mcpPlugin = mcpClient({
        name: tool.name,
        serverProcess: {
            command: tool.command,
            args: tool.args,
            env: tool.env,
        },
    });
    plugins.push(mcpPlugin);
}

export const ai = genkit({ plugins });
