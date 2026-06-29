'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCents, dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string };
type Line = { accountId: string; side: 'debit' | 'credit'; amount: string; description: string };

const emptyLine = (): Line => ({ accountId: '', side: 'debit', amount: '', description: '' });

export function JournalEntryForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { totalDebit, totalCredit } = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      const cents = dollarsToCents(parseFloat(line.amount || '0') || 0);
      if (line.side === 'debit') totalDebit += cents;
      else totalCredit += cents;
    }
    return { totalDebit, totalCredit };
  }, [lines]);

  const balanced = totalDebit === totalCredit && totalDebit > 0;

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!balanced) {
      setError('Debits and credits must balance before posting.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/journal-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        memo,
        lines: lines
          .filter((l) => l.accountId && l.amount)
          .map((l) => ({
            accountId: l.accountId,
            description: l.description || undefined,
            debitCents: l.side === 'debit' ? dollarsToCents(parseFloat(l.amount)) : 0,
            creditCents: l.side === 'credit' ? dollarsToCents(parseFloat(l.amount)) : 0,
          })),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setMemo('');
      setLines([emptyLine(), emptyLine()]);
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not post that entry.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Memo</label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="What is this entry for?"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_110px_auto] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Account
              </label>
              <Select
                value={line.accountId}
                onChange={(e) => updateLine(i, { accountId: e.target.value })}
                required
              >
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Side
              </label>
              <Select
                value={line.side}
                onChange={(e) => updateLine(i, { side: e.target.value as 'debit' | 'credit' })}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Amount
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={line.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={lines.length <= 2}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>
          + Add line
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <div className="tabular font-mono text-sm">
          <span className="text-ink-soft">Debits </span>
          <span className={totalDebit === totalCredit ? 'text-ink' : 'text-debit'}>
            {formatCents(totalDebit)}
          </span>
          <span className="mx-2 text-ink-soft">·</span>
          <span className="text-ink-soft">Credits </span>
          <span className={totalDebit === totalCredit ? 'text-ink' : 'text-debit'}>
            {formatCents(totalCredit)}
          </span>
        </div>
        <Button type="submit" disabled={!balanced || submitting}>
          {submitting ? 'Posting…' : 'Post entry'}
        </Button>
      </div>

      {error && <p className="text-sm text-debit">{error}</p>}
      {!balanced && totalDebit + totalCredit > 0 && (
        <p className="text-xs text-ink-soft">
          Out of balance by {formatCents(Math.abs(totalDebit - totalCredit))} — entries can&apos;t post
          until debits equal credits.
        </p>
      )}
    </form>
  );
}
