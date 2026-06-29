import { prisma } from '@/lib/prisma';
import { assertAccountsInOrg } from '@/lib/ownership';
import { signedDelta } from '@/lib/pure/ledger-rules';

/** The account's reconciled balance as of the last COMPLETED reconciliation — the starting point for the next one. */
export async function getLastReconciledBalance(accountId: string) {
  const last = await prisma.reconciliation.findFirst({
    where: { accountId, status: 'COMPLETED' },
    orderBy: { statementDate: 'desc' },
  });
  return { beginningCents: last?.statementEndingCents ?? 0, asOf: last?.statementDate ?? null };
}

export async function startReconciliation(input: {
  organizationId: string;
  accountId: string;
  statementDate: Date;
  statementEndingCents: number;
}) {
  await assertAccountsInOrg(input.organizationId, [input.accountId]);

  const inProgress = await prisma.reconciliation.findFirst({
    where: { accountId: input.accountId, status: 'IN_PROGRESS' },
  });
  if (inProgress) return inProgress;

  return prisma.reconciliation.create({
    data: {
      organizationId: input.organizationId,
      accountId: input.accountId,
      statementDate: input.statementDate,
      statementEndingCents: input.statementEndingCents,
    },
  });
}

/** Every journal line on this account, up to the statement date, not already locked into a completed reconciliation. */
export async function getCandidateLines(accountId: string, statementDate: Date) {
  return prisma.journalLine.findMany({
    where: {
      accountId,
      reconciliationId: null,
      journalEntry: { date: { lte: statementDate } },
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { date: 'asc' } },
  });
}

export async function completeReconciliation(reconciliationId: string, clearedLineIds: string[]) {
  const reconciliation = await prisma.reconciliation.findUniqueOrThrow({
    where: { id: reconciliationId },
    include: { account: true },
  });
  if (reconciliation.status === 'COMPLETED') {
    throw new Error('This reconciliation has already been completed.');
  }

  return prisma.$transaction(async (tx) => {
    const lines = await tx.journalLine.findMany({
      where: { id: { in: clearedLineIds }, accountId: reconciliation.accountId },
    });
    if (lines.length !== clearedLineIds.length) {
      throw new Error('One or more selected transactions are invalid for this account.');
    }

    const { beginningCents } = await getLastReconciledBalance(reconciliation.accountId);
    const clearedDelta = lines.reduce(
      (sum, l) => sum + signedDelta(reconciliation.account.normalBalance, l.debitCents, l.creditCents),
      0
    );
    const computedEndingCents = beginningCents + clearedDelta;

    if (computedEndingCents !== reconciliation.statementEndingCents) {
      throw new Error(
        `Doesn't balance yet: cleared transactions total ${computedEndingCents} cents, statement says ${reconciliation.statementEndingCents} cents.`
      );
    }

    await tx.journalLine.updateMany({
      where: { id: { in: clearedLineIds } },
      data: { reconciliationId: reconciliation.id },
    });

    return tx.reconciliation.update({
      where: { id: reconciliation.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  });
}

export async function cancelReconciliation(reconciliationId: string) {
  const reconciliation = await prisma.reconciliation.findUniqueOrThrow({
    where: { id: reconciliationId },
  });
  if (reconciliation.status === 'COMPLETED') {
    throw new Error('Completed reconciliations are locked — cancel only works on an in-progress one.');
  }
  return prisma.reconciliation.delete({ where: { id: reconciliationId } });
}
