export class UnbalancedEntryError extends Error {
  constructor(debits: number, credits: number) {
    super(`Journal entry does not balance: debits=${debits} credits=${credits}`);
  }
}

export type LedgerLineInput = {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
  description?: string;
  classId?: string;
};

/**
 * The single invariant that makes this a double-entry ledger: total debits
 * must equal total credits, every line must carry exactly one side, and the
 * entry must actually move money (not just be a no-op of zero-value lines).
 */
export function assertBalanced(lines: LedgerLineInput[]) {
  const totalDebits = lines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);

  if (totalDebits !== totalCredits || totalDebits === 0) {
    throw new UnbalancedEntryError(totalDebits, totalCredits);
  }
  for (const line of lines) {
    const d = line.debitCents ?? 0;
    const c = line.creditCents ?? 0;
    if (d > 0 && c > 0) {
      throw new Error('A single journal line cannot carry both a debit and a credit.');
    }
    if (d === 0 && c === 0) {
      throw new Error('Every journal line must have a non-zero debit or credit.');
    }
  }
}

export type NormalBalanceLiteral = 'DEBIT' | 'CREDIT';

/** An account's normal-balance sign convention: debit-normal accounts read positive when debited, credit-normal when credited. */
export function signedDelta(
  normalBalance: NormalBalanceLiteral,
  debitCents: number,
  creditCents: number
) {
  return normalBalance === 'DEBIT' ? debitCents - creditCents : creditCents - debitCents;
}
