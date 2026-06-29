import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getCandidateLines, getLastReconciledBalance } from '@/lib/reconciliation';
import { ReconciliationChecklist } from '@/components/reconciliation-checklist';

export default async function ReconciliationDetailPage({ params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: { account: true },
  });
  if (!reconciliation) notFound();

  const [candidateLines, { beginningCents }] = await Promise.all([
    getCandidateLines(reconciliation.accountId, reconciliation.statementDate),
    getLastReconciledBalance(reconciliation.accountId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">{reconciliation.account.name}</h1>
        <p className="text-sm text-ink-soft">
          Statement through{' '}
          {reconciliation.statementDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <ReconciliationChecklist
        reconciliationId={reconciliation.id}
        normalBalance={reconciliation.account.normalBalance}
        beginningCents={beginningCents}
        statementEndingCents={reconciliation.statementEndingCents}
        candidateLines={candidateLines.map((l) => ({
          id: l.id,
          debitCents: l.debitCents,
          creditCents: l.creditCents,
          description: l.description,
          journalEntry: { date: l.journalEntry.date.toISOString(), memo: l.journalEntry.memo },
        }))}
      />
    </div>
  );
}
