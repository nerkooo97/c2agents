'use server';

import { generateSpeechStream } from '@/ai/flows/text-to-speech';
import { NextRequest } from 'next/server';
import { Stream } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const audioStream = await generateSpeechStream(text) as Stream;

    const readableStream = new ReadableStream({
      start(controller) {
        audioStream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        audioStream.on('end', () => {
          controller.close();
        });
        audioStream.on('error', (err) => {
          console.error('Stream error from TTS flow:', err);
          controller.error(err);
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/octet-stream', // Sending raw PCM data
      },
    });

  } catch (error) {
    console.error('Error in speech API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
