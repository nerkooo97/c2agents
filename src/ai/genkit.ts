import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openai} from 'genkitx-openai';
import {next} from '@genkit-ai/next';

const plugins: GenkitPlugin[] = [next(), googleAI()];

if (process.env.OPENAI_API_KEY) {
  // Rely on the plugin to read the environment variable, which is more robust.
  plugins.push(openai());
}

export const ai = genkit({
  plugins,
});
