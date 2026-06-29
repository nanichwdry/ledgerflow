'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function PlaidLinkButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'linking' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setLinkToken(data.linkToken ?? null))
      .catch(() => setStatus('error'));
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setStatus('linking');
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken }),
      });
      if (res.ok) {
        router.refresh();
        setStatus('idle');
      } else {
        setStatus('error');
      }
    },
    [router]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess,
  });

  return (
    <div>
      <Button
        onClick={() => {
          if (linkToken === 'mock_link_token') {
            onSuccess('mock_public_token');
          } else {
            open();
          }
        }}
        disabled={(linkToken !== 'mock_link_token' && !ready) || status === 'linking'}
      >
        {status === 'linking' ? 'Linking account…' : 'Connect a bank account'}
      </Button>
      {status === 'error' && (
        <p className="mt-2 text-sm text-debit">
          Couldn&apos;t connect right now. Check your Plaid credentials and try again.
        </p>
      )}
    </div>
  );

}
