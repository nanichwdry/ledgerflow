'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string; type: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function BudgetGridForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [name, setName] = useState(`${new Date().getFullYear()} Operating Budget`);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [values, setValues] = useState<Record<string, string>>({}); // key: `${accountId}:${month}`
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCell(accountId: string, month: number, value: string) {
    setValues((prev) => ({ ...prev, [`${accountId}:${month}`]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const lines = Object.entries(values)
      .filter(([, v]) => v && parseFloat(v) !== 0)
      .map(([key, v]) => {
        const [accountId, monthStr] = key.split(':');
        return { accountId, month: parseInt(monthStr, 10), amountCents: dollarsToCents(parseFloat(v)) };
      });

    if (lines.length === 0) {
      setSubmitting(false);
      setError('Enter at least one monthly amount.');
      return;
    }

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, year: parseInt(year, 10), lines }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { budget } = await res.json();
      router.push(`/dashboard/budgets/${budget.id}`);
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not create that budget.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Year</label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-rule">
        <table className="text-sm">
          <thead>
            <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
              <th className="sticky left-0 bg-surface px-3 py-2 text-left">Account</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 text-right">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="ledger-rule">
                <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-1.5 text-ink">
                  {account.code} · {account.name}
                </td>
                {MONTHS.map((_, i) => (
                  <td key={i} className="px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 rounded-sm border border-rule bg-paper px-1.5 py-1 text-right text-xs"
                      value={values[`${account.id}:${i + 1}`] ?? ''}
                      onChange={(e) => setCell(account.id, i + 1, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Create budget'}
      </Button>
      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
