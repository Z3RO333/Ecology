import { NextResponse } from 'next/server';

// Returns the build version (git SHA baked in at build time). The tablet polls
// this and reloads itself when it changes, so a new deploy never leaves a stale
// kiosk page calling Server Action IDs the new server no longer knows.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
