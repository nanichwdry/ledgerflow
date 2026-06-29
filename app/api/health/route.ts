import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    assertEnv();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message ?? 'Unknown error' },
      { status: 503 }
    );
  }
}
