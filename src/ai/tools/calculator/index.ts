import {ai} from '@/ai/genkit';
import {z} from 'zod';

const calculator = ai.defineTool({
  name: 'calculator',
  description: 'Useful for getting the answer to a mathematical expression.',
  inputSchema: z.object({
    expression: z.string().describe('A plain mathematical expression that can be evaluated by eval().'),
  }),
  outputSchema: z.number(),
}, async (input) => {
  try {
    // WARNING: Using eval() is generally unsafe. This is for demonstration purposes only.
    // In a real application, use a safe math expression parser.
    // eslint-disable-next-line no-eval
    return eval(input.expression) as number;
  } catch (e) {
    return NaN;
  }
});

export default calculator;
