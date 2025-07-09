'use server';
/**
 * @fileOverview Converts text to speech using a specified model.
 * - `generateSpeech`: Converts a string of text into a WAV or MP3 audio data URI.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';
import {z} from 'zod';
import wav from 'wav';
import type {ModelReference} from 'genkit/model';

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const TextToSpeechInputSchema = z.object({
    text: z.string(),
    model: z.string(),
});

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: z.string(),
  },
  async ({ text, model }) => {
    let modelRef: ModelReference<any>;
    
    if (model.startsWith('tts-')) {
        modelRef = openAI.model(model);
        const { media } = await ai.generate({
          model: modelRef,
          prompt: text,
        });

        if (!media) {
            throw new Error('No audio media returned from OpenAI TTS model.');
        }
        // OpenAI returns audio directly in the desired format (e.g., MP3) as a data URI
        return media.url;

    } else { // Assume Google model otherwise
        modelRef = googleAI.model(model);
        const { media } = await ai.generate({
          model: modelRef,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Algenib' },
              },
            },
          },
          prompt: text,
        });

        if (!media) {
          throw new Error('No audio media returned from Google TTS model.');
        }
        
        // Google returns raw PCM data that needs to be converted to WAV
        const audioBuffer = Buffer.from(
          media.url.substring(media.url.indexOf(',') + 1),
          'base64'
        );
        const wavData = await toWav(audioBuffer);
        return `data:audio/wav;base64,${wavData}`;
    }
  }
);

export async function generateSpeech(text: string, model: string): Promise<string> {
    return textToSpeechFlow({ text, model });
}
