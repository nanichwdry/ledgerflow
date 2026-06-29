'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string };

export function StartReconciliationForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [endingBalance, setEndingBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/reconciliations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        statementDate,
        statementEndingCents: dollarsToCents(parseFloat(endingBalance) || 0),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { reconciliation } = await res.json();
      router.push(`/dashboard/reconcile/${reconciliation.id}`);
    } else {
      const body = await res.json();
      setError(body.error ?? 'Could not start reconciliation.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Account</label>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Statement date
        </label>
        <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} required />
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Ending balance
        </label>
        <Input
          type="number"
          step="0.01"
          value={endingBalance}
          onChange={(e) => setEndingBalance(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={submitting || !accountId}>
        {submitting ? 'Starting…' : 'Start reconciling'}
      </Button>
      {error && <p className="w-full text-sm text-debit">{error}</p>}
    </form>
  );
}
