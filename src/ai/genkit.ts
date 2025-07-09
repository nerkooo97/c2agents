import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Use require for the next plugin to avoid ESM/CJS issues in Next.js
const nextPlugin = require('@genkit-ai/next');
const next = nextPlugin.next;

const plugins: GenkitPlugin[] = [next(), googleAI()];

export const ai = genkit({
  plugins,
});
