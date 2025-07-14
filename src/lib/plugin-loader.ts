// This is a new file for the file-based plugin management system.
import type { GenkitPlugin } from 'genkit';
import { mcpClient } from 'genkitx-mcp';
import type { PluginDefinition } from '@/lib/types';
import { allPlugins } from '@/plugins';

// Dynamically loads all defined MCP plugins from the central registry.
export async function loadMcpPlugins(): Promise<GenkitPlugin[]> {
    const mcpPlugins: GenkitPlugin[] = [];
    
    try {
        const rawDefinitions = await loadRawPluginDefinitions();
        
        for (const pluginDef of rawDefinitions) {
            if (pluginDef && pluginDef.enabled && pluginDef.command && pluginDef.args) {
                const mcpPlugin = mcpClient({
                    name: pluginDef.name,
                    serverProcess: {
                        command: pluginDef.command,
                        args: pluginDef.args,
                        env: pluginDef.env,
                    },
                });
                mcpPlugins.push(mcpPlugin);
                console.log(`[Plugin Loader] Loaded MCP Plugin: ${pluginDef.name}`);
            } else if (pluginDef && pluginDef.enabled) {
                console.warn(`[Plugin Loader] Skipping plugin '${pluginDef.name}' due to missing command or args.`);
            }
        }
    } catch (error) {
        console.error(`[Plugin Loader] Error loading MCP plugins:`, error);
    }
    
    return mcpPlugins;
}


// Loads all raw plugin definitions from the central registry.
export async function loadRawPluginDefinitions(): Promise<PluginDefinition[]> {
    // Since plugins are now statically imported, we just return the array.
    // The promise is kept for API consistency.
    return Promise.resolve(allPlugins);
}
