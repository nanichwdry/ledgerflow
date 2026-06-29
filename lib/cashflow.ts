import { prisma } from '@/lib/prisma';

/**
 * A simplified direct-method cash flow statement: every dollar moving in or
 * out of a cash-pool account (bank feeds + Undeposited Funds) is bucketed as
 * Operating, unless its journal entry also touches an Equity account, in
 * which case it's classified as Financing. This covers day-to-day revenue/
 * expense/AR/AP cash movement and owner contributions/draws or loan proceeds
 * correctly, but doesn't separate out Investing activity (e.g. equipment
 * purchases) — there's no fixed-asset account type yet to classify on.
 */
export async function getCashFlowStatement(organizationId: string, from: Date, to: Date) {
  const cashAccounts = await prisma.account.findMany({
    where: { organizationId, isCashAccount: true, archived: false },
  });
  const cashAccountIds = cashAccounts.map((a) => a.id);

  if (cashAccountIds.length === 0) {
    return {
      from,
      to,
      beginningCents: 0,
      endingCents: 0,
      operatingCents: 0,
      financingCents: 0,
      netChangeCents: 0,
    };
  }

  const [priorLines, periodLines] = await Promise.all([
    prisma.journalLine.findMany({
      where: { accountId: { in: cashAccountIds }, journalEntry: { organizationId, date: { lt: from } } },
    }),
    prisma.journalLine.findMany({
      where: {
        accountId: { in: cashAccountIds },
        journalEntry: { organizationId, date: { gte: from, lte: to } },
      },
      include: { journalEntry: { include: { lines: { include: { account: true } } } } },
    }),
  ]);

  // Cash-pool accounts are always debit-normal (asset), so debit - credit = inflow.
  const beginningCents = priorLines.reduce((s, l) => s + (l.debitCents - l.creditCents), 0);

  let operatingCents = 0;
  let financingCents = 0;
  for (const line of periodLines) {
    const delta = line.debitCents - line.creditCents;
    const contraLines = line.journalEntry.lines.filter((l) => !cashAccountIds.includes(l.accountId));
    const isFinancing = contraLines.some((l) => l.account.type === 'EQUITY');
    if (isFinancing) financingCents += delta;
    else operatingCents += delta;
  }

  return {
    from,
    to,
    beginningCents,
    endingCents: beginningCents + operatingCents + financingCents,
    operatingCents,
    financingCents,
    netChangeCents: operatingCents + financingCents,
  };
}
