import { prisma } from '@/lib/prisma';
import { ruleMatches, type MatchableTransaction } from '@/lib/pure/categorize-rules';

export type { MatchableTransaction };

/**
 * Returns the first CategorizationRule (lowest priority number first) whose
 * pattern matches this transaction, or null if nothing matches — callers
 * fall back to an "Uncategorized" account so the ledger always stays balanced.
 */
export async function findMatchingAccount(organizationId: string, txn: MatchableTransaction) {
  const rules = await prisma.categorizationRule.findMany({
    where: { organizationId },
    include: { account: true },
    orderBy: { priority: 'asc' },
  });

  for (const rule of rules) {
    if (ruleMatches(rule, txn)) return rule.account;
  }
  return null;
}

/** Ensures the two catch-all accounts every org needs for unmatched transactions exist. */
export async function ensureFallbackAccounts(organizationId: string) {
  const [uncategorizedExpense, uncategorizedIncome] = await Promise.all([
    prisma.account.upsert({
      where: { organizationId_code: { organizationId, code: '6999' } },
      update: {},
      create: {
        organizationId,
        code: '6999',
        name: 'Uncategorized Expense',
        type: 'EXPENSE',
        normalBalance: 'DEBIT',
      },
    }),
    prisma.account.upsert({
      where: { organizationId_code: { organizationId, code: '4999' } },
      update: {},
      create: {
        organizationId,
        code: '4999',
        name: 'Uncategorized Income',
        type: 'REVENUE',
        normalBalance: 'CREDIT',
      },
    }),
  ]);
  return { uncategorizedExpense, uncategorizedIncome };
}
