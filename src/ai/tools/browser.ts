// src/ai/tools/browser.ts
'use server';

import { Page, Browser, chromium } from 'playwright';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { runInAction } from 'genkit';

// A Map to hold the browser state (Page and Browser objects) for each unique flow run.
// The 'traceId' is a unique identifier for each execution of a Genkit flow.
const browserState = new Map<string, { browser: Browser; page: Page }>();

// Initializes a new browser instance and stores it in the state map.
// Set headless to false to visually observe the automation.
export async function initBrowser(traceId: string): Promise<Page> {
  if (browserState.has(traceId)) {
    return browserState.get(traceId)!.page;
  }
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const page = await browser.newPage();
  browserState.set(traceId, { browser, page });
  return page;
}

// Closes the browser and cleans up the state map.
export async function closeBrowser(traceId: string): Promise<void> {
  if (browserState.has(traceId)) {
    await browserState.get(traceId)!.browser.close();
    browserState.delete(traceId);
  }
}

// Retrieves the active Page object for the current flow run.
function getPage(traceId: string): Page {
  if (!browserState.has(traceId)) {
    throw new Error('Browser is not initialized. Call navigateToUrl first.');
  }
  return browserState.get(traceId)!.page;
}

// === GENKIT TOOLS ===

export const navigateToUrlTool = ai.defineTool(
  {
    name: 'navigateToUrl',
    description: 'Navigates to a specified web URL. This must be the first step.',
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: z.string(),
  },
  async ({ url }, { traceId }) => {
    return runInAction({ name: 'init-browser' }, async () => {
      const page = await initBrowser(traceId);
      await page.goto(url);
      return `Successfully navigated to ${url}.`;
    });
  }
);

export const typeTextTool = ai.defineTool(
  {
    name: 'typeText',
    description: 'Types text into an element identified by a CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe("The CSS selector of the input field, e.g., 'input#departure-city'"),
      text: z.string().describe("The text to type."),
    }),
    outputSchema: z.string(),
  },
  async ({ selector, text }, { traceId }) => {
    const page = getPage(traceId);
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
    }),
    outputSchema: z.string(),
  },
  async ({ selector }, { traceId }) => {
    const page = getPage(traceId);
    await page.click(selector);
    return `Successfully clicked element "${selector}".`;
  }
);

export const readPageContentTool = ai.defineTool(
  {
    name: 'readPageContent',
    description: 'Reads the visible text content from the current page to decide the next action. Should be used after navigation or a click to "see" the results.',
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async (_, { traceId }) => {
    const page = getPage(traceId);
    await page.waitForLoadState('networkidle');
    const content = await page.evaluate(() => document.body.innerText);
    // Truncate the content to avoid exceeding the model's context limit.
    return content.substring(0, 4000);
  }
);
