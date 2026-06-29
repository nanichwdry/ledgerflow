'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string };

export function InvoiceActions({
  invoiceId,
  status,
  balanceDueCents,
  publicUrl,
  customerEmail,
  cashAccounts,
  lastEmailedAt,
  emailReady,
}: {
  invoiceId: string;
  status: string;
  balanceDueCents: number;
  publicUrl: string;
  customerEmail: string | null;
  cashAccounts: Account[];
  lastEmailedAt: string | null;
  emailReady: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [amount, setAmount] = useState((balanceDueCents / 100).toString());
  const [depositAccountId, setDepositAccountId] = useState(cashAccounts[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [emailTo, setEmailTo] = useState(customerEmail ?? '');
  const [emailMessage, setEmailMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSend() {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
    setSending(false);
    if (res.ok) router.refresh();
    else {
      const body = await res.json();
      setError(body.error ?? 'Could not send invoice.');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: dollarsToCents(parseFloat(amount) || 0),
        date,
        depositAccountId,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setShowPayment(false);
      router.refresh();
    } else {
      const body = await res.json();
      setError(body.error ?? 'Could not record payment.');
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSubmitting(true);
    setEmailError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, message: emailMessage || undefined }),
    });
    setEmailSubmitting(false);
    if (res.ok) {
      setShowEmail(false);
      setEmailMessage('');
      router.refresh();
    } else {
      const body = await res.json();
      setEmailError(typeof body.error === 'string' ? body.error : 'Could not send that email.');
    }
  }

  const mailtoHref = customerEmail
    ? `mailto:${customerEmail}?subject=${encodeURIComponent('Your invoice')}&body=${encodeURIComponent(
        `Hi,\n\nHere is your invoice: ${publicUrl}\n\nThanks!`
      )}`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'DRAFT' && (
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send invoice'}
          </Button>
        )}
        {status !== 'DRAFT' && status !== 'PAID' && status !== 'VOID' && (
          <Button onClick={() => setShowPayment((s) => !s)} variant="secondary">
            Record payment
          </Button>
        )}
        {status !== 'DRAFT' && (
          <>
            <a href={`/api/invoices/${invoiceId}/pdf`}>
              <Button variant="secondary">Download PDF</Button>
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Link copied' : 'Copy customer link'}
            </Button>
            {emailReady ? (
              <Button variant="secondary" onClick={() => setShowEmail((s) => !s)}>
                Email invoice
              </Button>
            ) : (
              mailtoHref && (
                <a href={mailtoHref}>
                  <Button variant="secondary">Open in mail app</Button>
                </a>
              )
            )}
            {lastEmailedAt && (
              <span className="text-xs text-ink-soft">
                Last emailed {new Date(lastEmailedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </>
        )}
      </div>

      {showEmail && (
        <form onSubmit={handleEmail} className="space-y-2 rounded-sm border border-rule bg-paper p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-64">
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">To</label>
              <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required />
            </div>
            <Button type="submit" disabled={emailSubmitting}>
              {emailSubmitting ? 'Sending…' : 'Send email'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowEmail(false)}>
              Cancel
            </Button>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
              Note (optional)
            </label>
            <Input
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Thanks for your business — here's your invoice."
            />
          </div>
          {emailError && <p className="text-sm text-debit">{emailError}</p>}
          {mailtoHref && (
            <p className="text-xs text-ink-soft">
              Prefer your own mail client?{' '}
              <a href={mailtoHref} className="text-brass-dark hover:underline">
                Open in mail app
              </a>{' '}
              instead.
            </p>
          )}
        </form>
      )}

      {showPayment && (
        <form onSubmit={handleRecordPayment} className="flex flex-wrap items-end gap-2 rounded-sm border border-rule bg-paper p-3">
          <div className="w-28">
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Amount</label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="w-56">
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
              Deposit to
            </label>
            <Select value={depositAccountId} onChange={(e) => setDepositAccountId(e.target.value)} required>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record'}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-debit">{error}</p>}
    </div>
  );
}
