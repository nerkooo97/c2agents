'use server';

import { spawn, type ChildProcess } from 'child_process';
import { mcpServers } from '@/lib/agent-registry';

const runningServers = new Map<string, ChildProcess>();

// Function to start a server
export async function startServer(name: string): Promise<void> {
    if (runningServers.has(name)) {
        console.log(`[MCP Manager] Server '${name}' is already running.`);
        return;
    }

    const config = mcpServers[name];
    if (!config) {
        throw new Error(`[MCP Manager] Configuration for server '${name}' not found.`);
    }

    console.log(`[MCP Manager] Starting server '${name}' with command: ${config.command} ${config.args.join(' ')}`);

    const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe'], // pipe stdout, stderr
        detached: false, // Don't detach, manage as part of the main process lifecycle
    });
    
    runningServers.set(name, serverProcess);

    serverProcess.stdout?.on('data', (data) => {
        console.log(`[${name}-mcp-server]: ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
        console.error(`[${name}-mcp-server-error]: ${data.toString().trim()}`);
    });
    
    serverProcess.on('error', (err) => {
        console.error(`[MCP Manager] Failed to start server '${name}':`, err);
        runningServers.delete(name);
    });

    serverProcess.on('exit', (code) => {
        console.log(`[MCP Manager] Server '${name}' exited with code ${code}.`);
        runningServers.delete(name);
    });
    
    // Return a promise that resolves after a short delay to allow the server to initialize
    // This helps prevent race conditions where the tool tries to fetch before the server is ready.
    return new Promise(resolve => setTimeout(resolve, 2000));
}

// Function to stop a server
export function stopServer(name: string): void {
    const serverProcess = runningServers.get(name);
    if (serverProcess && !serverProcess.killed) {
        console.log(`[MCP Manager] Stopping server '${name}'...`);
        serverProcess.kill('SIGINT'); // Send SIGINT for a graceful shutdown
        runningServers.delete(name);
    }
}

// Function to stop all servers
export function stopAllServers(): void {
    console.log('[MCP Manager] Shutting down all MCP servers...');
    for (const name of runningServers.keys()) {
        stopServer(name);
    }
}

// Graceful shutdown hooks
// Ensure that child processes are killed when the main application exits.
process.on('beforeExit', stopAllServers);
process.on('SIGINT', () => {
    stopAllServers();
    process.exit();
});
process.on('SIGTERM', () => {
    stopAllServers();
    process.exit();
});

// We can import this file in a central server-side module to ensure these hooks are registered.
