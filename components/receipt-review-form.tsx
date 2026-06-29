'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCents, dollarsToCents } from '@/lib/utils';

type Vendor = { id: string; name: string };
type Account = { id: string; code: string; name: string };

type Line = { description: string; quantity: string; unitCostCents: string; expenseAccountId: string };

export function ReceiptReviewForm({
  receiptId,
  vendors,
  expenseAccounts,
  extractedVendorName,
  extractedDate,
  extractedLines,
}: {
  receiptId: string;
  vendors: Vendor[];
  expenseAccounts: Account[];
  extractedVendorName: string | null;
  extractedDate: string | null;
  extractedLines: { description: string; amountCents: number }[];
}) {
  const router = useRouter();
  const defaultExpenseAccountId = expenseAccounts[0]?.id ?? '';
  const matchedVendor = vendors.find(
    (v) => v.name.toLowerCase() === (extractedVendorName ?? '').toLowerCase()
  );
  const [vendorId, setVendorId] = useState(matchedVendor?.id ?? '');
  const [vendorName, setVendorName] = useState(matchedVendor ? '' : extractedVendorName ?? '');
  const [billDate, setBillDate] = useState(extractedDate ?? new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>(
    extractedLines.length > 0
      ? extractedLines.map((l) => ({
          description: l.description,
          quantity: '1',
          unitCostCents: (l.amountCents / 100).toString(),
          expenseAccountId: defaultExpenseAccountId,
        }))
      : [{ description: '', quantity: '1', unitCostCents: '', expenseAccountId: defaultExpenseAccountId }]
  );
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorId: vendorId || undefined,
        vendorName: vendorId ? undefined : vendorName,
        billDate,
        dueDate: billDate,
        lines: lines
          .filter((l) => l.description && l.unitCostCents)
          .map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitCostCents: dollarsToCents(parseFloat(l.unitCostCents) || 0),
            expenseAccountId: l.expenseAccountId,
          })),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      const { bill } = await res.json();
      router.push(`/dashboard/bills/${bill.id}`);
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not convert this receipt.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Vendor (existing)
          </label>
          <Select
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value);
              if (e.target.value) setVendorName('');
            }}
          >
            <option value="">— new vendor —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        {!vendorId && (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
              New vendor name
            </label>
            <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Bill date</label>
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_100px_1fr_auto] items-end gap-2">
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
                Amount
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
                Expense account
              </label>
              <Select
                value={line.expenseAccountId}
                onChange={(e) => updateLine(i, { expenseAccountId: e.target.value })}
                required
              >
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
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
          onClick={() =>
            setLines((p) => [
              ...p,
              { description: '', quantity: '1', unitCostCents: '', expenseAccountId: defaultExpenseAccountId },
            ])
          }
        >
          + Add line
        </Button>
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <span className="tabular font-mono text-sm text-ink">Total {formatCents(totalCents)}</span>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Converting…' : 'Confirm & post bill'}
        </Button>
      </div>

      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
