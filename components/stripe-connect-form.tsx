'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StripeConnectForm({
  connected,
  webhookUrl,
}: {
  connected: boolean;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/integrations/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey, webhookSecret }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSecretKey('');
      setWebhookSecret('');
      router.refresh();
    } else {
      const body = await res.json();
      setError(body.error ?? 'Could not connect Stripe.');
    }
  }

  async function handleDisconnect() {
    setSubmitting(true);
    await fetch('/api/integrations/stripe', { method: 'DELETE' });
    setSubmitting(false);
    router.refresh();
  }

  if (connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-credit">Stripe is connected — invoices get a pay-by-link automatically.</p>
        <Button variant="secondary" onClick={handleDisconnect} disabled={submitting}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect} className="space-y-4">
      <div className="rounded-sm border border-rule bg-paper p-3 text-sm text-ink-soft">
        <p className="mb-2">In your Stripe Dashboard:</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>Grab a secret key (Developers → API keys).</li>
          <li>
            Create a webhook endpoint (Developers → Webhooks) pointing to{' '}
            <code className="rounded bg-rule/40 px-1 font-mono text-xs">{webhookUrl}</code>{' '}
            listening for <code className="rounded bg-rule/40 px-1 font-mono text-xs">checkout.session.completed</code>.
          </li>
          <li>Copy that endpoint&apos;s signing secret below.</li>
        </ol>
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Secret key</label>
        <Input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="sk_live_… or sk_test_…"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
          Webhook signing secret
        </label>
        <Input
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder="whsec_…"
          required
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Connecting…' : 'Connect Stripe'}
      </Button>
      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
