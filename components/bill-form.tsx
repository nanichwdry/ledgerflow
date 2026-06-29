'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCents, dollarsToCents } from '@/lib/utils';

type Vendor = { id: string; name: string };
type Account = { id: string; code: string; name: string };
type InventoryItem = { id: string; sku: string; name: string };
type ClassOption = { id: string; name: string };

type Line = {
  description: string;
  quantity: string;
  unitCostCents: string;
  expenseAccountId: string;
  inventoryItemId: string;
  classId: string;
};

const emptyLine = (defaultExpenseAccountId: string): Line => ({
  description: '',
  quantity: '1',
  unitCostCents: '',
  expenseAccountId: defaultExpenseAccountId,
  inventoryItemId: '',
  classId: '',
});

export function BillForm({
  vendors,
  expenseAccounts,
  inventoryItems,
  classes,
}: {
  vendors: Vendor[];
  expenseAccounts: Account[];
  inventoryItems: InventoryItem[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const defaultExpenseAccountId = expenseAccounts[0]?.id ?? '';
  const [vendorId, setVendorId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(defaultExpenseAccountId)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = useMemo(
    () =>
      lines.reduce(
        (sum, l) =>
          sum +
          Math.round((parseFloat(l.quantity || '0') || 0) * dollarsToCents(parseFloat(l.unitCostCents || '0') || 0)),
        0
      ),
    [lines]
  );

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function applyInventoryItem(i: number, itemId: string) {
    const item = inventoryItems.find((it) => it.id === itemId);
    updateLine(i, { inventoryItemId: itemId, description: item ? item.name : '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId,
        billDate,
        dueDate,
        reference: reference || undefined,
        lines: lines
          .filter((l) => l.description && l.unitCostCents)
          .map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitCostCents: dollarsToCents(parseFloat(l.unitCostCents) || 0),
            expenseAccountId: l.expenseAccountId,
            inventoryItemId: l.inventoryItemId || undefined,
            classId: l.classId || undefined,
          })),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      const { bill } = await res.json();
      router.push(`/dashboard/bills/${bill.id}`);
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not enter that bill.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Vendor</label>
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
            <option value="">Select vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Bill date</label>
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Due date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Vendor&apos;s reference # (optional)
        </label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} className="w-56" />
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_100px_1fr_1fr_1fr_auto] items-end gap-2">
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
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Unit cost
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={line.unitCostCents}
                onChange={(e) => updateLine(i, { unitCostCents: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Inventory item (optional)
              </label>
              <Select value={line.inventoryItemId} onChange={(e) => applyInventoryItem(i, e.target.value)}>
                <option value="">— expense line —</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} · {it.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
                Expense account
              </label>
              <Select
                value={line.expenseAccountId}
                onChange={(e) => updateLine(i, { expenseAccountId: e.target.value })}
                disabled={!!line.inventoryItemId}
                required
              >
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
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
          onClick={() => setLines((p) => [...p, emptyLine(defaultExpenseAccountId)])}
        >
          + Add line
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <span className="tabular font-mono text-sm text-ink">Total {formatCents(totalCents)}</span>
        <Button type="submit" disabled={submitting || !vendorId}>
          {submitting ? 'Entering…' : 'Enter bill'}
        </Button>
      </div>

      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
