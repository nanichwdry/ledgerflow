'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function SyncButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={syncing}
      onClick={async () => {
        setSyncing(true);
        await fetch('/api/plaid/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });
        setSyncing(false);
        router.refresh();
      }}
    >
      {syncing ? 'Syncing…' : 'Sync now'}
    </Button>
  );
}
