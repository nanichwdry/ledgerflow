'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCents, dollarsToCents } from '@/lib/utils';

type Customer = { id: string; name: string };
type Account = { id: string; code: string; name: string };
type InventoryItem = { id: string; sku: string; name: string; defaultSaleCents: number };
type ClassOption = { id: string; name: string };
type TaxRateOption = { id: string; name: string; ratePercent: number };

type Line = {
  description: string;
  quantity: string;
  unitPriceCents: string;
  revenueAccountId: string;
  inventoryItemId: string;
  classId: string;
};

const emptyLine = (defaultRevenueAccountId: string): Line => ({
  description: '',
  quantity: '1',
  unitPriceCents: '',
  revenueAccountId: defaultRevenueAccountId,
  inventoryItemId: '',
  classId: '',
});

export function InvoiceForm({
  customers,
  revenueAccounts,
  inventoryItems,
  classes,
  taxRates,
}: {
  customers: Customer[];
  revenueAccounts: Account[];
  inventoryItems: InventoryItem[];
  classes: ClassOption[];
  taxRates: TaxRateOption[];
}) {
  const router = useRouter();
  const defaultRevenueAccountId = revenueAccounts[0]?.id ?? '';
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [taxRateId, setTaxRateId] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(defaultRevenueAccountId)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalCents = useMemo(
    () =>
      lines.reduce(
        (sum, l) =>
          sum + Math.round((parseFloat(l.quantity || '0') || 0) * dollarsToCents(parseFloat(l.unitPriceCents || '0') || 0)),
        0
      ),
    [lines]
  );
  const taxCents = Math.round(subtotalCents * ((parseFloat(taxRate || '0') || 0) / 100));
  const totalCents = subtotalCents + taxCents;

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function applyInventoryItem(i: number, itemId: string) {
    const item = inventoryItems.find((it) => it.id === itemId);
    updateLine(i, {
      inventoryItemId: itemId,
      description: item ? item.name : '',
      unitPriceCents: item ? (item.defaultSaleCents / 100).toString() : '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        issueDate,
        dueDate,
        notes: notes || undefined,
        taxCents,
        taxRateId: taxRateId || undefined,
        lines: lines
          .filter((l) => l.description && l.unitPriceCents)
          .map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitPriceCents: dollarsToCents(parseFloat(l.unitPriceCents) || 0),
            revenueAccountId: l.revenueAccountId,
            inventoryItemId: l.inventoryItemId || undefined,
            classId: l.classId || undefined,
          })),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      const { invoice } = await res.json();
      router.push(`/dashboard/invoices/${invoice.id}`);
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not create that invoice.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Customer</label>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Issue date</label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Due date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_100px_1fr_1fr_auto] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Description
              </label>
              <Input
                value={line.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Qty</label>
              <Input
                type="number"
                step="1"
                min="0"
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Rate</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={line.unitPriceCents}
                onChange={(e) => updateLine(i, { unitPriceCents: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Inventory item (optional)
              </label>
              <Select value={line.inventoryItemId} onChange={(e) => applyInventoryItem(i, e.target.value)}>
                <option value="">— manual line —</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} · {it.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Class (optional)
              </label>
              <Select value={line.classId} onChange={(e) => updateLine(i, { classId: e.target.value })}>
                <option value="">{classes.length === 0 ? 'No classes yet' : '—'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={lines.length <= 1}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLines((p) => [...p, emptyLine(defaultRevenueAccountId)])}
        >
          + Add line
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Tax rate
          </label>
          <div className="flex gap-2">
            <Select
              value={taxRateId}
              onChange={(e) => {
                const id = e.target.value;
                setTaxRateId(id);
                const rate = taxRates.find((t) => t.id === id);
                if (rate) setTaxRate(rate.ratePercent.toString());
              }}
              className="w-48"
            >
              <option value="">Custom %…</option>
              {taxRates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={taxRate}
              onChange={(e) => {
                setTaxRate(e.target.value);
                setTaxRateId('');
              }}
              className="w-24"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <div className="tabular font-mono text-sm text-ink-soft">
          Subtotal {formatCents(subtotalCents)} · Tax {formatCents(taxCents)} ·{' '}
          <span className="text-ink">Total {formatCents(totalCents)}</span>
        </div>
        <Button type="submit" disabled={submitting || !customerId}>
          {submitting ? 'Creating…' : 'Create draft'}
        </Button>
      </div>

      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
