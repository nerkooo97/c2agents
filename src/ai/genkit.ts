import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The @genkit-ai/next plugin seems to be causing runtime issues with server actions.
// Removing it for now to ensure core agent functionality works.
const plugins: GenkitPlugin[] = [googleAI()];

export const ai = genkit({
  plugins,
});
