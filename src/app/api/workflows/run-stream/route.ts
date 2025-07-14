
import { runWorkflowFlow } from '@/ai/flows/run-workflow';
import { initBrowser, closeBrowser, type BrowserSession } from '@/ai/tools/browser';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('[run-stream API] Received POST request.');
  const workflowExecutionId = crypto.randomUUID();
  const browserSessions = new Map<string, BrowserSession>();

  try {
    const { goal, nodes, edges } = await request.json();
    console.log('[run-stream API] Request body parsed successfully.');

    if (!goal || !nodes || !edges) {
      console.error('[run-stream API] Error: Missing goal, nodes, or edges.');
      return new NextResponse(
        JSON.stringify({ type: 'error', error: 'Missing goal, nodes, or edges.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hasBrowserTool = nodes.some((node: any) => 
        node.type === 'customAgentNode' && 
        node.data.agentName === 'browser-agent'
    );

    if (hasBrowserTool) {
        console.log(`[run-stream API] Workflow requires browser. Initializing for ${workflowExecutionId}...`);
        browserSessions.set(workflowExecutionId, await initBrowser());
        console.log(`[run-stream API] Browser initialized for ${workflowExecutionId}.`);
    }

    const flowInput = {
      goal,
      nodes,
      edges,
      workflowExecutionId,
      browserSessions,
    };

    console.log('[run-stream API] Calling runWorkflowFlow.stream() with input:', { goal, nodes: nodes.length, edges: edges.length, workflowExecutionId });
    const { stream, response } = runWorkflowFlow.stream(flowInput);
    console.log('[run-stream API] Genkit stream initiated.');

    const readableStream = new ReadableStream({
        async start(controller) {
            console.log('[run-stream API] ReadableStream started.');
            const reader = stream.getReader();
            try {
                while(true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log('[run-stream API] Genkit stream finished (done).');
                        break;
                    }
                    // console.log('[run-stream API] Received chunk from Genkit:', value);
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`));
                }
            } catch (e) {
                console.error('[run-stream API] Error reading from Genkit stream:', e);
                const errorMessage = e instanceof Error ? e.message : 'Unknown stream error.';
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`));
            } finally {
                console.log('[run-stream API] Stream reading finished. Waiting for final response promise...');
                try {
                    await response;
                    console.log(`[run-stream API] Workflow ${workflowExecutionId} finished successfully.`);
                } catch (e) {
                    console.error(`[run-stream API] Workflow ${workflowExecutionId} failed with error:`, e);
                }
                
                const session = browserSessions.get(workflowExecutionId);
                if (session) {
                    await closeBrowser(session);
                    browserSessions.delete(workflowExecutionId);
                    console.log(`[run-stream API] Browser session for ${workflowExecutionId} closed.`);
                }
                
                console.log('[run-stream API] Closing controller.');
                controller.close();
            }
        }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start workflow stream.';
    console.error('[run-stream API] Top-level error:', error);
    
    const session = browserSessions.get(workflowExecutionId);
    if (session) {
        await closeBrowser(session);
        browserSessions.delete(workflowExecutionId);
    }

    return new NextResponse(JSON.stringify({
      type: 'error',
      error: `Workflow failed. ${errorMessage}`
    }), { status: 500, headers: {'Content-Type': 'application/json'}});
  }
}
