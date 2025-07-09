'use server';
/**
 * @fileOverview Converts text to speech.
 * - `generateSpeech`: Converts a string of text into a WAV audio data URI.
 * - `generateSpeechStream`: Converts a string of text into a stream of WAV audio data chunks.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'zod';
import wav from 'wav';
import { PassThrough } from 'stream';

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

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (query) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: query,
    });
    if (!media) {
      throw new Error('No audio media returned from TTS model.');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const wavData = await toWav(audioBuffer);
    return `data:audio/wav;base64,${wavData}`;
  }
);

export async function generateSpeech(text: string): Promise<string> {
    return textToSpeechFlow(text);
}


// New streaming flow
const textToSpeechStreamFlow = ai.defineFlow(
  {
    name: 'textToSpeechStreamFlow',
    inputSchema: z.string(),
    outputSchema: z.any(),
    stream: true,
  },
  async (query) => {
    const { stream } = ai.generateStream({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: query,
    });

    const passthrough = new PassThrough();

    (async () => {
        // We don't use the wav writer here, just pass the raw PCM chunks
        for await (const chunk of stream) {
            if (chunk.media) {
                 const audioBuffer = Buffer.from(
                    chunk.media.url.substring(chunk.media.url.indexOf(',') + 1),
                    'base64'
                );
                passthrough.write(audioBuffer);
            }
        }
        passthrough.end();
    })();
    
    return { stream: passthrough };
  }
);


export async function generateSpeechStream(text: string) {
    const { stream } = await textToSpeechStreamFlow(text);
    return stream;
}
