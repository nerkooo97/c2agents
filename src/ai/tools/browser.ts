// src/ai/tools/browser.ts
'use server';

import { Page, Browser, chromium } from 'playwright';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export interface BrowserSession {
  browser: Browser;
  page: Page;
}

// Initializes a new browser instance.
export async function initBrowser(): Promise<BrowserSession> {
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const page = await browser.newPage();
  return { browser, page };
}

// Closes the browser.
export async function closeBrowser(session: BrowserSession): Promise<void> {
  if (session) {
    await session.browser.close();
  }
}

// Retrieves the active Page object for the current workflow run.
function getPage(workflowExecutionId: string, browserSessions: Map<string, BrowserSession>): Page {
  const session = browserSessions.get(workflowExecutionId);
  if (!session) {
    throw new Error('Browser is not initialized for this workflow. Call navigateToUrl first.');
  }
  return session.page;
}

// === GENKIT TOOLS ===

const BrowserToolInputSchema = z.object({
  workflowExecutionId: z.string(),
  browserSessions: z.any(), // Pass the map; Zod doesn't handle Maps well
});

export const navigateToUrlTool = ai.defineTool(
  {
    name: 'navigateToUrl',
    description: 'Navigates to a specified web URL. This must be the first browser step in a workflow.',
    inputSchema: z.object({
      url: z.string().url(),
      workflowExecutionId: z.string(),
      browserSessions: z.any(),
    }),
    outputSchema: z.string(),
  },
  async ({ url, workflowExecutionId, browserSessions }) => {
    // The browser session is now initialized in the main workflow flow.
    const page = getPage(workflowExecutionId, browserSessions);
    await page.goto(url);
    return `Successfully navigated to ${url}.`;
  }
);

export const typeTextTool = ai.defineTool(
  {
    name: 'typeText',
    description: 'Types text into an element identified by a CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe("The CSS selector of the input field, e.g., 'input#departure-city'"),
      text: z.string().describe("The text to type."),
      workflowExecutionId: z.string(),
      browserSessions: z.any(),
    }),
    outputSchema: z.string(),
  },
  async ({ selector, text, workflowExecutionId, browserSessions }) => {
    const page = getPage(workflowExecutionId, browserSessions);
    await page.type(selector, text, { delay: 100 });
    return `Successfully typed "${text}" into element "${selector}".`;
  }
);

export const clickElementTool = ai.defineTool(
  {
    name: 'clickElement',
    description: 'Clicks on an element (like a button or link) identified by a CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe("The CSS selector of the clickable element, e.g., 'button#search-flights'"),
      workflowExecutionId: z.string(),
      browserSessions: z.any(),
    }),
    outputSchema: z.string(),
  },
  async ({ selector, workflowExecutionId, browserSessions }) => {
    const page = getPage(workflowExecutionId, browserSessions);
    await page.click(selector);
    return `Successfully clicked element "${selector}".`;
  }
);

export const readPageContentTool = ai.defineTool(
  {
    name: 'readPageContent',
    description: 'Reads the visible text content from the current page to decide the next action. Should be used after navigation or a click to "see" the results.',
    inputSchema: z.object({
      workflowExecutionId: z.string(),
      browserSessions: z.any(),
    }),
    outputSchema: z.string(),
  },
  async ({ workflowExecutionId, browserSessions }) => {
    const page = getPage(workflowExecutionId, browserSessions);
    await page.waitForLoadState('networkidle');
    const content = await page.evaluate(() => document.body.innerText);
    // Truncate the content to avoid exceeding the model's context limit.
    return content.substring(0, 4000);
  }
);
