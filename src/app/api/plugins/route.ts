import { NextResponse } from 'next/server';
import { loadRawPluginDefinitions } from '@/lib/plugin-loader';

export async function GET() {
  try {
    const plugins = await loadRawPluginDefinitions();
    return NextResponse.json(plugins);
  } catch (error) {
      console.error("Error fetching plugin definitions:", error);
      const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
