import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentMembership } from '@/lib/supabase/server';
import { postJournalEntry, UnbalancedEntryError } from '@/lib/ledger';
import { logAudit } from '@/lib/audit';

const lineSchema = z.object({
  accountId: z.string().min(1),
  debitCents: z.number().int().min(0).default(0),
  creditCents: z.number().int().min(0).default(0),
  description: z.string().optional(),
});

const createSchema = z.object({
  date: z.coerce.date(),
  memo: z.string().min(1).max(280),
  lines: z.array(lineSchema).min(2),
});

export async function GET(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  const entries = await prisma.journalEntry.findMany({
    where: { organizationId: membership.organizationId },
    include: { lines: { include: { account: true } } },
    orderBy: { date: 'desc' },
    take: limit,
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const entry = await postJournalEntry({
      organizationId: membership.organizationId,
      date: parsed.data.date,
      memo: parsed.data.memo,
      lines: parsed.data.lines,
    });
    await logAudit(prisma, {
      organizationId: membership.organizationId,
      actorUserId: membership.userId ?? 'unknown',
      actorEmail: membership.email,
      entityType: 'JournalEntry',
      entityId: entry.id,
      action: 'CREATE',
      summary: `Posted manual journal entry: ${parsed.data.memo}`,
      after: entry,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    if (err instanceof UnbalancedEntryError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof Error && err.message.includes('do not belong to this organization')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Failed to post journal entry', err);
    return NextResponse.json({ error: 'Could not post that entry.' }, { status: 500 });
  }
}
