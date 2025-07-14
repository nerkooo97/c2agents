// This is a new file for a centralized agent registry.
import type { AgentDefinition } from '@/lib/types';
import { allAgents, agentMap } from '@/agents';

/**
 * Loads all agent definitions from the central registry.
 * This is now a simple synchronous operation.
 * @returns A promise that resolves to an array of all agent definitions.
 */
export async function loadAgents(): Promise<AgentDefinition[]> {
    // The agents are statically imported, so we just return them.
    // The list is sorted by name in the central index file.
    return Promise.resolve(allAgents);
}

/**
 * Retrieves a single agent definition by its name.
 * @param name The name of the agent to retrieve.
 * @returns A promise that resolves to the agent definition or undefined if not found.
 */
export async function getAgentDefinition(name: string): Promise<AgentDefinition | undefined> {
    const agentDef = agentMap[name];
    
    if (agentDef) {
        return Promise.resolve(agentDef);
    }
    
    // Fallback for sanitized names in case the definition name doesn't match folder name
    const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const agentBySanitizedName = allAgents.find(a => a.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === sanitizedName);

    if (agentBySanitizedName) {
        return Promise.resolve(agentBySanitizedName);
    }

    console.warn(`[Agent Registry] Agent definition for '${name}' not found.`);
    return Promise.resolve(undefined);
}
