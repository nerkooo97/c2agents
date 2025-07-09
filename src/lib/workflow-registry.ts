import fs from 'fs/promises';
import path from 'path';
import type { WorkflowDefinition } from '@/lib/types';

const workflowsDir = path.join(process.cwd(), 'src', 'workflows');

async function ensureWorkflowsDir(): Promise<void> {
  try {
    await fs.access(workflowsDir);
  } catch (error) {
    // Directory doesn't exist, create it.
    await fs.mkdir(workflowsDir, { recursive: true });
  }
}

// NOTE: No caching, as workflows can be created/deleted during the app lifecycle.
// A more advanced implementation might use a watcher or invalidate the cache on mutations.
export async function getWorkflows(): Promise<WorkflowDefinition[]> {
  await ensureWorkflowsDir();
  try {
    const files = await fs.readdir(workflowsDir);
    const workflowPromises = files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const filePath = path.join(workflowsDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const workflow = JSON.parse(fileContent) as WorkflowDefinition;
        return workflow;
      });
    
    const workflows = await Promise.all(workflowPromises);
    return workflows.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
     console.error(`[Workflow Loader] Could not read workflows directory at ${workflowsDir}:`, error);
     return [];
  }
}
