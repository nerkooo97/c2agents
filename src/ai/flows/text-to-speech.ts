'use server';
/**
 * @fileOverview Converts text to speech using a specified model.
 * - `generateSpeech`: Converts a string of text into a WAV or MP3 audio data URI.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';
import OpenAI from 'openai';

// Helper function to convert raw PCM data from Google to a WAV buffer
async function toWav(pcmData: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const writer = new wav.Writer({
            channels: 1,
            sampleRate: 24000,
            bitDepth: 16,
        });

        const bufs: Buffer[] = [];
        writer.on('data', (d) => bufs.push(d));
        writer.on('end', () => resolve(Buffer.concat(bufs)));
        writer.on('error', reject);

        writer.write(pcmData);
        writer.end();
    });
}

// This function now directly handles API calls for simplicity and stability.
export async function generateSpeech(text: string, model: string): Promise<string> {
    if (model.startsWith('tts-') || model.startsWith('gpt-')) {
        const openaiClient = new OpenAI();
        const mp3 = await openaiClient.audio.speech.create({
            model: model as any, // e.g., 'tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        return `data:audio/mpeg;base64,${buffer.toString('base64')}`;

    } else { // Assume Google model otherwise
        const { media } = await ai.generate({
            model: googleAI.model(model),
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

        const audioBuffer = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
        );

        // Convert the raw PCM data to a proper WAV file format
        const wavBuffer = await toWav(audioBuffer);
        return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
    }
}
