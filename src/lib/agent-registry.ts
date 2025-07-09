// This file is intentionally blank.
// The agent loading logic has been moved directly into the API route
// (`src/app/api/agents/route.ts`) to prevent server-side modules
// like 'fs' from being included in client-side bundles, which was
// causing a ChunkLoadError.

import type { AgentDefinition } from '@/lib/types';

// This function is now a placeholder as the logic is server-side.
export async function getAgents(): Promise<AgentDefinition[]> {
  console.warn("getAgents should only be called from server-side code but is now being called from a client-safe module.");
  return [];
}

export async function getAgent(name: string): Promise<AgentDefinition | undefined> {
   console.warn("getAgent should only be called from server-side code but is now being called from a client-safe module.");
   return undefined;
}
