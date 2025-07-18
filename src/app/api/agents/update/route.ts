

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { AgentFormData } from '@/lib/types';
import { AgentDefinitionSchema } from '@/lib/types';

// Helper to sanitize agent name for folder creation
const sanitizeAgentName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const createAgentFileContent = (agentData: AgentFormData): string => {
    const toolsString = JSON.stringify(agentData.tools || []);
    const systemPromptString = agentData.systemPrompt.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const constraintsString = (agentData.constraints || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const defaultTaskString = (agentData.defaultTask || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `// This is an autogenerated file from Firebase Studio.
import type { AgentDefinition } from '@/lib/types';

const agent: AgentDefinition = {
  name: '${agentData.name}',
  description: '${agentData.description}',
  model: '${agentData.model}',
  systemPrompt: \`${systemPromptString}\`,
  constraints: \`${constraintsString}\`,
  defaultTask: \`${defaultTaskString}\`,
  responseFormat: '${agentData.responseFormat}',
  tools: ${toolsString},
  enableApiAccess: ${agentData.enableApiAccess},
  realtime: ${agentData.realtime},
  enableMemory: ${agentData.enableMemory},
  icon: '${agentData.icon || 'Bot'}',
  iconColor: '${agentData.iconColor || 'hsl(var(--primary))'}',
};

export default agent;
`;
};

export async function POST(request: Request) {
    try {
        const { originalName, agentData } = await request.json() as { originalName: string, agentData: AgentFormData };

        const parseResult = AgentDefinitionSchema.safeParse(agentData);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid agent data', details: parseResult.error.flatten() }, { status: 400 });
        }

        const originalAgentFolderName = sanitizeAgentName(originalName);
        const newAgentFolderName = sanitizeAgentName(agentData.name);

        const agentsDir = path.join(process.cwd(), 'src', 'agents');
        const originalAgentDir = path.join(agentsDir, originalAgentFolderName);
        const newAgentDir = path.join(agentsDir, newAgentFolderName);

        try {
            await fs.access(originalAgentDir);
        } catch (error) {
            return NextResponse.json({ error: `Agent with original name '${originalName}' not found.` }, { status: 404 });
        }

        let finalAgentDir = originalAgentDir;
        if (originalAgentFolderName !== newAgentFolderName) {
            try {
                await fs.access(newAgentDir);
                return NextResponse.json({ error: `An agent with the new name '${agentData.name}' already exists.` }, { status: 409 });
            } catch (error) {
                // New name is available, rename the directory
                await fs.rename(originalAgentDir, newAgentDir);
                finalAgentDir = newAgentDir;
            }
        }

        const filePath = path.join(finalAgentDir, 'index.ts');
        const fileContent = createAgentFileContent(agentData);
        await fs.writeFile(filePath, fileContent, 'utf-8');
        
        return NextResponse.json({ message: 'Agent updated successfully', agent: agentData });

    } catch (e) {
        console.error('Error updating agent:', e);
        const errorMessage = e instanceof Error ? e.message : 'An internal server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
