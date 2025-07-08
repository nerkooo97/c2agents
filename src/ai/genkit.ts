import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openai} from 'genkitx-openai';

const plugins: GenkitPlugin[] = [googleAI()];

if (process.env.OPENAI_API_KEY) {
  // Rely on the plugin to read the environment variable, which is more robust.
  plugins.push(openai());
}

export const ai = genkit({
  plugins,
});
