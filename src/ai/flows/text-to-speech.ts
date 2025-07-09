'use server';
/**
 * @fileOverview Converts text to speech using a specified model.
 * - `generateSpeech`: Converts a string of text into a WAV or MP3 audio data URI.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'zod';
import wav from 'wav';
import OpenAI from 'openai';

// This flow is defined but not directly used by the streaming endpoint.
// It remains for non-streaming use cases or as a fallback.
const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: z.object({ text: z.string(), model: z.string() }),
    outputSchema: z.string(),
  },
  async ({ text, model }) => {
     if (model.startsWith('tts-')) {
        const openaiClient = new OpenAI();
        const mp3 = await openaiClient.audio.speech.create({
            model: model as any,
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        return `data:audio/mpeg;base64,${buffer.toString('base64')}`;

    } else { // Assume Google model otherwise
        const modelRef = googleAI.model(model);
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
        
        const writer = new wav.Writer({
            channels: 1,
            sampleRate: 24000,
            bitDepth: 16,
        });

        const bufs: Buffer[] = [];
        writer.on('data', (d) => bufs.push(d));

        return new Promise((resolve, reject) => {
            writer.on('end', () => {
                resolve(`data:audio/wav;base64,${Buffer.concat(bufs).toString('base64')}`);
            });
            writer.on('error', reject);
            writer.write(audioBuffer);
            writer.end();
        });
    }
  }
);


/**
 * A new function dedicated to streaming audio for real-time applications.
 * It directly uses the OpenAI client to leverage the streaming API.
 */
export async function streamSpeech(text: string, model: string): Promise<ReadableStream<Uint8Array>> {
    if (!model.startsWith('tts-') && !model.startsWith('gpt-')) {
        throw new Error(`Model ${model} does not support streaming speech.`);
    }

    const openaiClient = new OpenAI();
    
    // Use the gpt-4o-mini-tts model for fast responses
    const ttsModel = model === 'gpt-4o-mini-tts' ? 'gpt-4o-mini-tts' : 'tts-1';

    try {
        const response = await openaiClient.audio.speech.with_streaming_response.create({
            model: ttsModel,
            voice: 'alloy',
            input: text,
            response_format: 'pcm', // Use PCM for lowest latency
        });
        
        if (!response.body) {
             throw new Error("The response body is null.");
        }

        return response.body;

    } catch (error) {
        console.error("Error streaming speech from OpenAI:", error);
        throw new Error("Failed to stream audio from OpenAI.");
    }
}


// The original function for non-streaming generation remains.
export async function generateSpeech(text: string, model: string): Promise<string> {
    return textToSpeechFlow({ text, model });
}
