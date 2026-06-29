'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string };

export function PayBillForm({
  billId,
  balanceDueCents,
  cashAccounts,
}: {
  billId: string;
  balanceDueCents: number;
  cashAccounts: Account[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((balanceDueCents / 100).toString());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidFromAccountId, setPaidFromAccountId] = useState(cashAccounts[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/bills/${billId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: dollarsToCents(parseFloat(amount) || 0), date, paidFromAccountId }),
    });
    setSubmitting(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(body.error ?? 'Could not record payment.');
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Pay bill</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-sm border border-rule bg-paper p-3">
      <div className="w-28">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Amount</label>
        <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Pay from</label>
        <Select value={paidFromAccountId} onChange={(e) => setPaidFromAccountId(e.target.value)} required>
          {cashAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Paying…' : 'Confirm payment'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-debit">{error}</p>}
    </form>
  );
}
