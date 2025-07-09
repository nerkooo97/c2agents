'use server';

import { streamSpeech } from '@/ai/flows/text-to-speech';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, model } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!model) {
        return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    // Use the new streaming function
    const audioStream = await streamSpeech(text, model);

    // Return the stream directly to the client
    return new NextResponse(audioStream, {
        headers: {
            'Content-Type': 'audio/pcm',
        },
    });

  } catch (error) {
    console.error('Error in speech API:', error);
    let errorMessage = 'An internal server error occurred.';
    let statusCode = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('429')) {
             statusCode = 429;
             errorMessage = "API rate limit exceeded. You may have run out of free daily quota.";
        }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
