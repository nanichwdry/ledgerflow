import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getCandidateLines, getLastReconciledBalance, cancelReconciliation } from '@/lib/reconciliation';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: { account: true },
  });
  if (!reconciliation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [candidateLines, { beginningCents }] = await Promise.all([
    getCandidateLines(reconciliation.accountId, reconciliation.statementDate),
    getLastReconciledBalance(reconciliation.accountId),
  ]);

  return NextResponse.json({ reconciliation, candidateLines, beginningCents });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!reconciliation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await cancelReconciliation(reconciliation.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not cancel.' }, { status: 400 });
  }
}
