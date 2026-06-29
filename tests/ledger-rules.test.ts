import { describe, it, expect } from 'vitest';
import { assertBalanced, signedDelta, UnbalancedEntryError } from '@/lib/pure/ledger-rules';

describe('assertBalanced', () => {
  it('accepts a simple balanced two-line entry', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', debitCents: 1000 },
        { accountId: 'b', creditCents: 1000 },
      ])
    ).not.toThrow();
  });

  it('accepts a multi-line entry as long as totals balance', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'ar', debitCents: 1080 },
        { accountId: 'revenue', creditCents: 1000 },
        { accountId: 'tax-payable', creditCents: 80 },
      ])
    ).not.toThrow();
  });

  it('rejects debits ≠ credits', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', debitCents: 1000 },
        { accountId: 'b', creditCents: 999 },
      ])
    ).toThrow(UnbalancedEntryError);
  });

  it('rejects an all-zero entry (a no-op disguised as a post)', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', debitCents: 0 },
        { accountId: 'b', creditCents: 0 },
      ])
    ).toThrow(UnbalancedEntryError);
  });

  it('rejects a line carrying both a debit and a credit', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', debitCents: 500, creditCents: 500 },
        { accountId: 'b', creditCents: 0, debitCents: 0 },
      ])
    ).toThrow(/cannot carry both/);
  });

  it('rejects a line with neither a debit nor a credit', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a', debitCents: 1000 },
        { accountId: 'b', creditCents: 1000 },
        { accountId: 'c' },
      ])
    ).toThrow(/non-zero debit or credit/);
  });

  it('the error message reports the actual mismatched totals', () => {
    try {
      assertBalanced([
        { accountId: 'a', debitCents: 1500 },
        { accountId: 'b', creditCents: 1000 },
      ]);
      throw new Error('expected assertBalanced to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UnbalancedEntryError);
      expect((err as Error).message).toContain('1500');
      expect((err as Error).message).toContain('1000');
    }
  });
});

describe('signedDelta', () => {
  it('debit-normal accounts (assets/expenses) read positive when debited', () => {
    expect(signedDelta('DEBIT', 1000, 0)).toBe(1000);
    expect(signedDelta('DEBIT', 0, 1000)).toBe(-1000);
  });

  it('credit-normal accounts (liabilities/equity/revenue) read positive when credited', () => {
    expect(signedDelta('CREDIT', 0, 1000)).toBe(1000);
    expect(signedDelta('CREDIT', 1000, 0)).toBe(-1000);
  });

  it('nets out when both sides are hit (e.g. a partial refund)', () => {
    expect(signedDelta('DEBIT', 1000, 400)).toBe(600);
    expect(signedDelta('CREDIT', 400, 1000)).toBe(600);
  });
});
