'use server';
/**
 * @fileoverview A tool for browsing websites using Playwright.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import playwright from 'playwright-aws-lambda';

const playwrightTool = ai.defineTool(
  {
    name: 'playwright',
    description:
      'Browse a website and return its textual content. This is useful for accessing information on the web.',
    inputSchema: z.object({
      url: z.string().describe('The URL to browse.'),
    }),
    outputSchema: z.string(),
  },
  async ({url}) => {
    let browser = null;
    try {
      browser = await playwright.launchChromium({headless: true});
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url);
      const textContent = await page.evaluate(() => document.body.innerText);
      return textContent || 'No content found on the page.';
    } catch (error) {
      console.error('Playwright tool error:', error);
      return `Error browsing URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
);

export default playwrightTool;
