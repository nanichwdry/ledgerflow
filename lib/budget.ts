import { prisma } from '@/lib/prisma';
import { signedDelta } from '@/lib/pure/ledger-rules';

export async function createBudget(input: {
  organizationId: string;
  name: string;
  year: number;
  lines: { accountId: string; month: number; amountCents: number }[];
}) {
  return prisma.budget.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      year: input.year,
      lines: { create: input.lines },
    },
    include: { lines: true },
  });
}

export async function updateBudgetLines(
  budgetId: string,
  lines: { accountId: string; month: number; amountCents: number }[]
) {
  return prisma.$transaction(async (tx) => {
    await tx.budgetLine.deleteMany({ where: { budgetId } });
    await tx.budgetLine.createMany({ data: lines.map((l) => ({ budgetId, ...l })) });
    return tx.budget.findUniqueOrThrow({ where: { id: budgetId }, include: { lines: true } });
  });
}

export type BudgetVsActualRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  monthly: { month: number; budgetCents: number; actualCents: number; varianceCents: number }[];
  totalBudgetCents: number;
  totalActualCents: number;
  totalVarianceCents: number;
};

export async function getBudgetVsActual(budgetId: string): Promise<BudgetVsActualRow[]> {
  const budget = await prisma.budget.findUniqueOrThrow({
    where: { id: budgetId },
    include: { lines: { include: { account: true } } },
  });

  const accountIds: string[] = Array.from(
    new Set<string>(budget.lines.map((l) => l.accountId as string))
  );
  const yearStart = new Date(budget.year, 0, 1);
  const yearEnd = new Date(budget.year, 11, 31, 23, 59, 59);

  const actualLines = await prisma.journalLine.findMany({
    where: { accountId: { in: accountIds }, journalEntry: { date: { gte: yearStart, lte: yearEnd } } },
    include: { journalEntry: true, account: true },
  });

  const rows: BudgetVsActualRow[] = [];
  for (const accountId of accountIds) {
    const accountLines = budget.lines.filter((l) => l.accountId === accountId);
    const account = accountLines[0].account;

    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const budgetCents = accountLines.find((l) => l.month === month)?.amountCents ?? 0;
      const actualCents = actualLines
        .filter((al) => al.accountId === accountId && al.journalEntry.date.getMonth() + 1 === month)
        .reduce((sum, al) => sum + signedDelta(account.normalBalance, al.debitCents, al.creditCents), 0);
      return { month, budgetCents, actualCents, varianceCents: actualCents - budgetCents };
    });

    rows.push({
      accountId,
      accountCode: account.code,
      accountName: account.name,
      monthly,
      totalBudgetCents: monthly.reduce((s, m) => s + m.budgetCents, 0),
      totalActualCents: monthly.reduce((s, m) => s + m.actualCents, 0),
      totalVarianceCents: monthly.reduce((s, m) => s + m.varianceCents, 0),
    });
  }

  return rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}
