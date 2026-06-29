import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMembership } from '@/lib/supabase/server';
import { deleteJournalEntry } from '@/lib/ledger';
import { logAudit } from '@/lib/audit';
import { canDeleteEntries } from '@/lib/membership';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canDeleteEntries(membership.role)) {
    return NextResponse.json({ error: "Your role can't delete journal entries." }, { status: 403 });
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
    include: { lines: true },
  });
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  if (entry.source === 'PLAID_SYNC') {
    return NextResponse.json(
      { error: 'Synced entries are deleted by recategorizing the transaction instead.' },
      { status: 400 }
    );
  }
  if (entry.lines.some((l: { reconciliationId: string | null }) => l.reconciliationId)) {
    return NextResponse.json(
      { error: 'This entry is part of a completed reconciliation and is locked from editing.' },
      { status: 400 }
    );
  }

  await deleteJournalEntry(entry.id);
  await logAudit(prisma, {
    organizationId: membership.organizationId,
    actorUserId: membership.userId ?? 'unknown',
    actorEmail: membership.email,
    entityType: 'JournalEntry',
    entityId: entry.id,
    action: 'DELETE',
    summary: `Deleted journal entry: ${entry.memo}`,
    before: entry,
  });
  return NextResponse.json({ ok: true });
}
