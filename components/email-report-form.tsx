'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EmailReportForm({
  reportType,
  from,
  toDate,
}: {
  reportType: 'profit-loss' | 'balance-sheet' | 'cash-flow';
  from: string;
  toDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/reports/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message: message || undefined, reportType, from, toDate }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSent(true);
      setTo('');
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1500);
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not send that email.');
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Email report
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="w-56">
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">To</label>
        <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
      </div>
      <Button type="submit" disabled={submitting}>
        {sent ? 'Sent' : submitting ? 'Sending…' : 'Send'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-debit">{error}</p>}
    </form>
  );
}
