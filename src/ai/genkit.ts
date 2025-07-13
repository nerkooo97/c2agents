import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

const plugins: GenkitPlugin[] = [googleAI(), openAI()];

export const ai = genkit({ plugins });
