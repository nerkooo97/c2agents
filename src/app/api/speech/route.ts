'use server';

import { generateSpeech } from '@/ai/flows/text-to-speech';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioDataUri = await generateSpeech(text);

    return NextResponse.json({ audioDataUri });

  } catch (error) {
    console.error('Error in speech API:', error);
    let errorMessage = 'An internal server error occurred.';
    let statusCode = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific rate limit error from Google AI
        if (errorMessage.includes('429')) {
             statusCode = 429;
             errorMessage = "API rate limit exceeded. You may have run out of free daily quota.";
        }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
