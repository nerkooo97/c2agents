import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-and-store-memory.ts';
import '@/ai/flows/generate-agent-definition.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/tools/definitions.ts';
