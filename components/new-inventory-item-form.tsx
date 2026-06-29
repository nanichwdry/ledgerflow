'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dollarsToCents } from '@/lib/utils';

export function NewInventoryItemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [reorderPoint, setReorderPoint] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/inventory-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        name,
        defaultSaleCents: dollarsToCents(parseFloat(price || '0') || 0),
        reorderPoint: parseFloat(reorderPoint || '0') || 0,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSku('');
      setName('');
      setPrice('');
      setReorderPoint('0');
      setOpen(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not save that item.');
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New item
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-28">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">SKU</label>
        <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Default sale price
        </label>
        <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Reorder at
        </label>
        <Input
          type="number"
          step="1"
          min="0"
          value={reorderPoint}
          onChange={(e) => setReorderPoint(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-debit">{error}</p>}
    </form>
  );
}
