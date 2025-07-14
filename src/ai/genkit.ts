import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { genkit, type GenkitPlugin, type Plugin } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { openAI } from 'genkitx-openai';
import OpenAI from 'openai';

// Statically configure the core plugins.
// This ensures the `ai` object is always stable and available.
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const ai = genkit({
    plugins: [
        googleAI(),
        openAI({ client: openaiClient })
    ],
});

console.log("Core Genkit plugins configured.");
