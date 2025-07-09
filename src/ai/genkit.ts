import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {next} from '@genkit-ai/next';

const plugins: GenkitPlugin[] = [next(), googleAI()];

export const ai = genkit({
  plugins,
});
