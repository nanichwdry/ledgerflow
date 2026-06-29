'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

export function NewAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<typeof TYPES[number]>('EXPENSE');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, type }),
    });
    setSubmitting(false);
    if (res.ok) {
      setCode('');
      setName('');
      setOpen(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not create that account.');
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New account
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-20">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Code</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6030" required />
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shipping & Freight"
          required
        />
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Type</label>
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
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
