// This is a new file for the file-based tool management system.
import { NextResponse } from 'next/server';
import { loadRawPluginDefinitions } from '@/lib/plugin-loader';

export async function GET() {
  try {
    const tools = await loadRawPluginDefinitions();
    return NextResponse.json(tools);
  } catch (error) {
      console.error("Error fetching tools:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
