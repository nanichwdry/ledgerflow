'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
      <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">Something went wrong</p>
      <h1 className="mb-4 font-display text-2xl italic text-ink">This page hit a snag.</h1>
      <p className="mb-6 max-w-sm text-sm text-ink-soft">
        Nothing was changed in your books — it&apos;s safe to retry, or head back to the
        overview.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <a href="/dashboard">
          <Button variant="secondary">Back to overview</Button>
        </a>
      </div>
      {error.digest && <p className="mt-4 text-xs text-ink-soft">Reference: {error.digest}</p>}
    </div>
  );
}
