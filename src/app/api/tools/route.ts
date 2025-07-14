import { NextResponse } from 'next/server';

export async function GET() {
  // Return an empty array to disable tools while debugging
  return NextResponse.json([]);
}
