'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

type Line = {
  id: string;
  debitCents: number;
  creditCents: number;
  description: string | null;
  journalEntry: { date: string; memo: string };
};

export function ReconciliationChecklist({
  reconciliationId,
  normalBalance,
  beginningCents,
  statementEndingCents,
  candidateLines,
}: {
  reconciliationId: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  beginningCents: number;
  statementEndingCents: number;
  candidateLines: Line[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearedCents = useMemo(() => {
    return candidateLines
      .filter((l) => checked.has(l.id))
      .reduce((sum, l) => {
        const signed =
          normalBalance === 'DEBIT' ? l.debitCents - l.creditCents : l.creditCents - l.debitCents;
        return sum + signed;
      }, 0);
  }, [checked, candidateLines, normalBalance]);

  const endingCents = beginningCents + clearedCents;
  const differenceCents = statementEndingCents - endingCents;
  const balanced = differenceCents === 0;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reconciliations/${reconciliationId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearedLineIds: Array.from(checked) }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push('/dashboard/reconcile');
      router.refresh();
    } else {
      const body = await res.json();
      setError(body.error ?? 'Could not finish reconciliation.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 rounded-sm border border-rule bg-paper p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-soft">Beginning</p>
          <p className="tabular font-mono text-ink">{formatCents(beginningCents)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-soft">Cleared</p>
          <p className="tabular font-mono text-ink">{formatCents(clearedCents)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-soft">Statement says</p>
          <p className="tabular font-mono text-ink">{formatCents(statementEndingCents)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-soft">Difference</p>
          <p className={`tabular font-mono ${balanced ? 'text-credit' : 'text-debit'}`}>
            {formatCents(differenceCents)}
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-rule">
        <table className="w-full text-sm">
          <thead>
            <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
              <th className="w-10 px-5 py-2.5"></th>
              <th className="px-5 py-2.5 text-left">Date</th>
              <th className="px-5 py-2.5 text-left">Memo</th>
              <th className="px-5 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {candidateLines.map((line) => {
              const signed =
                normalBalance === 'DEBIT'
                  ? line.debitCents - line.creditCents
                  : line.creditCents - line.debitCents;
              return (
                <tr key={line.id} className="ledger-rule">
                  <td className="px-5 py-2.5">
                    <input
                      type="checkbox"
                      checked={checked.has(line.id)}
                      onChange={() => toggle(line.id)}
                      className="h-4 w-4 accent-brass"
                    />
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {new Date(line.journalEntry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-2.5 text-ink">{line.description || line.journalEntry.memo}</td>
                  <td className={`tabular px-5 py-2.5 text-right font-mono ${signed >= 0 ? 'text-credit' : 'text-debit'}`}>
                    {formatCents(signed)}
                  </td>
                </tr>
              );
            })}
            {candidateLines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                  Nothing to reconcile up to this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleFinish} disabled={!balanced || submitting || checked.size === 0}>
          {submitting ? 'Finishing…' : 'Finish reconciliation'}
        </Button>
        {!balanced && <p className="text-sm text-ink-soft">Check off transactions until the difference is $0.00.</p>}
      </div>
      {error && <p className="text-sm text-debit">{error}</p>}
    </div>
  );
}
