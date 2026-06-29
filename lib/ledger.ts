import { prisma } from '@/lib/prisma';
import { AccountType, JournalSource, Prisma } from '@prisma/client';
import {
  assertBalanced,
  signedDelta,
  UnbalancedEntryError,
  type LedgerLineInput,
} from '@/lib/pure/ledger-rules';

export { assertBalanced, signedDelta, UnbalancedEntryError };
export type { LedgerLineInput };

type Tx = Prisma.TransactionClient;

export type PostJournalEntryInput = {
  organizationId: string;
  date: Date;
  memo: string;
  source?: JournalSource;
  lines: LedgerLineInput[];
  plaidTransactionId?: string; // when set, links the entry back to the source Plaid row
};

/**
 * Core posting logic, scoped to a caller-supplied transaction. Use this when a
 * journal entry must commit atomically alongside other writes (e.g. an invoice's
 * inventory drawdown + AR posting + status change all succeed or fail together).
 * For a standalone post, use `postJournalEntry` below instead.
 */
export async function postJournalEntryInTx(tx: Tx, input: PostJournalEntryInput) {
  assertBalanced(input.lines);

  // Every accountId here can originate from a request body somewhere up the
  // call chain (manual entries especially). This is the one place all of
  // them pass through, so it's the one place that has to check: an account
  // belonging to a different organization must never be postable to.
  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const ownedAccounts = await tx.account.findMany({
    where: { id: { in: accountIds }, organizationId: input.organizationId },
    select: { id: true },
  });
  if (ownedAccounts.length !== accountIds.length) {
    throw new Error('One or more accounts in this entry do not belong to this organization.');
  }

  const entry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      date: input.date,
      memo: input.memo,
      source: input.source ?? JournalSource.MANUAL,
      lines: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debitCents: l.debitCents ?? 0,
          creditCents: l.creditCents ?? 0,
          description: l.description,
          classId: l.classId,
        })),
      },
    },
    include: { lines: true },
  });

  if (input.plaidTransactionId) {
    await tx.plaidTransaction.update({
      where: { id: input.plaidTransactionId },
      data: { journalEntryId: entry.id },
    });
  }

  return entry;
}

/**
 * Posts a journal entry. Every entry must have at least two lines whose debits
 * equal its credits in total — this single invariant is what makes the ledger
 * "double-entry." Posting is one Prisma transaction so a half-written entry
 * can never exist.
 */
export async function postJournalEntry(input: PostJournalEntryInput) {
  return prisma.$transaction((tx) => postJournalEntryInTx(tx, input));
}

export async function deleteJournalEntry(id: string, tx: Tx = prisma) {
  // Unlink any Plaid transaction first so it falls back to "needs review."
  await tx.plaidTransaction.updateMany({
    where: { journalEntryId: id },
    data: { journalEntryId: null },
  });
  return tx.journalEntry.delete({ where: { id } });
}

/**
 * Net balance of a single account, in its own normal-balance sign, optionally
 * scoped to a date range. Asset/Expense accounts read positive when debited;
 * Liability/Equity/Revenue accounts read positive when credited.
 */
export async function getAccountBalanceCents(
  accountId: string,
  opts: { asOf?: Date; from?: Date } = {}
) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        date: {
          ...(opts.from ? { gte: opts.from } : {}),
          ...(opts.asOf ? { lte: opts.asOf } : {}),
        },
      },
    },
  });
  const debit = lines.reduce((s, l) => s + l.debitCents, 0);
  const credit = lines.reduce((s, l) => s + l.creditCents, 0);
  return signedDelta(account.normalBalance, debit, credit);
}

/** Every account's balance as of a date — the foundation report all others derive from. */
export async function getTrialBalance(organizationId: string, asOf: Date = new Date()) {
  const accounts = await prisma.account.findMany({
    where: { organizationId, archived: false },
    include: {
      journalLines: {
        where: { journalEntry: { date: { lte: asOf } } },
      },
    },
    orderBy: { code: 'asc' },
  });

  return accounts.map((account) => {
    const debit = account.journalLines.reduce((s, l) => s + l.debitCents, 0);
    const credit = account.journalLines.reduce((s, l) => s + l.creditCents, 0);
    const balanceCents = signedDelta(account.normalBalance, debit, credit);
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      isBankFeed: account.isBankFeed,
      balanceCents,
    };
  });
}

/** Revenue − Expenses over a date range. */
export async function getProfitAndLoss(
  organizationId: string,
  from: Date,
  to: Date = new Date()
) {
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      archived: false,
      type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
    },
    include: {
      journalLines: { where: { journalEntry: { date: { gte: from, lte: to } } } },
    },
    orderBy: { code: 'asc' },
  });

  const lineItems = accounts.map((account) => {
    const debit = account.journalLines.reduce((s, l) => s + l.debitCents, 0);
    const credit = account.journalLines.reduce((s, l) => s + l.creditCents, 0);
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      amountCents: signedDelta(account.normalBalance, debit, credit),
    };
  });

  const revenueCents = lineItems
    .filter((l) => l.type === AccountType.REVENUE)
    .reduce((s, l) => s + l.amountCents, 0);
  const expenseCents = lineItems
    .filter((l) => l.type === AccountType.EXPENSE)
    .reduce((s, l) => s + l.amountCents, 0);

  return {
    from,
    to,
    revenue: lineItems.filter((l) => l.type === AccountType.REVENUE),
    expenses: lineItems.filter((l) => l.type === AccountType.EXPENSE),
    revenueCents,
    expenseCents,
    netIncomeCents: revenueCents - expenseCents,
  };
}

/** Assets = Liabilities + Equity, as of a date. Includes current-period net income in Equity. */
export async function getBalanceSheet(organizationId: string, asOf: Date = new Date()) {
  const trialBalance = await getTrialBalance(organizationId, asOf);

  const assets = trialBalance.filter((a) => a.type === AccountType.ASSET);
  const liabilities = trialBalance.filter((a) => a.type === AccountType.LIABILITY);
  const equity = trialBalance.filter((a) => a.type === AccountType.EQUITY);

  // Net income for all time up to `asOf`, rolled into equity until a formal closing entry exists.
  const pnl = await getProfitAndLoss(organizationId, new Date('1970-01-01'), asOf);

  const totalAssets = assets.reduce((s, a) => s + a.balanceCents, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balanceCents, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balanceCents, 0) + pnl.netIncomeCents;

  return {
    asOf,
    assets,
    liabilities,
    equity,
    retainedEarningsCents: pnl.netIncomeCents,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balances: totalAssets === totalLiabilities + totalEquity,
  };
}
