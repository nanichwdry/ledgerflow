'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewTaxRateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/tax-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, region: region || undefined, ratePercent: parseFloat(ratePercent) || 0 }),
    });
    setSubmitting(false);
    if (res.ok) {
      setName('');
      setRegion('');
      setRatePercent('');
      setOpen(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not save that rate.');
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New tax rate
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="California 7.25%" required />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Region (optional)
        </label>
        <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="CA" />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Rate %</label>
        <Input
          type="number"
          step="0.001"
          min="0"
          max="100"
          value={ratePercent}
          onChange={(e) => setRatePercent(e.target.value)}
          required
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
