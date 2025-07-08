'use server'

import { generateResponse } from '@/ai/flows/generate-response'
import { smartToolSelection } from '@/ai/flows/smart-tool-selection'
import type { ExecutionStep } from '@/lib/types'

export async function runAgent(
  prompt: string
): Promise<{ response?: string; steps?: ExecutionStep[]; error?: string }> {
  try {
    const steps: ExecutionStep[] = []

    // 1. Prompt Step
    steps.push({
      type: 'prompt',
      title: 'User Prompt',
      content: prompt,
    })

    // 2. Memory Step (Simulated)
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const memoryContent = 'No relevant long-term memories found.'
    steps.push({
      type: 'memory',
      title: 'Memory Retrieval',
      content: memoryContent,
    })

    // 3. Tool Selection Step
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const toolSelection = await smartToolSelection({ prompt });
    const toolUsed = toolSelection.response.includes('calculator') || toolSelection.response.includes('Web search')
    
    let toolName = 'None'
    let toolInput = 'N/A'
    let toolOutput = 'No tool was necessary. Responding directly.'

    if (toolUsed) {
        if (toolSelection.response.includes('calculator')) {
            toolName = 'calculator';
            // simple regex to extract expression
            const match = prompt.match(/([0-9+\-*/\s().]+)/);
            toolInput = match ? match[0].trim() : prompt;
        } else {
            toolName = 'webSearch';
            toolInput = prompt;
        }
        toolOutput = toolSelection.response;
    }
    
    steps.push({
      type: 'tool',
      title: 'Tool Selection & Execution',
      content: toolOutput,
      toolName,
      toolInput,
    });

    // 4. Final Response Generation
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const finalResponse = await generateResponse({
      prompt,
      memory: memoryContent,
      toolOutput: toolOutput,
    })

    steps.push({
      type: 'response',
      title: 'Agent Response',
      content: finalResponse.response,
    })

    return {
      response: finalResponse.response,
      steps: steps,
    }
  } catch (error) {
    console.error('Error running agent:', error)
    return {
      error: 'An unexpected error occurred while running the agent.',
    }
  }
}
