'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-body antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">Something went wrong</p>
          <h1 className="mb-4 font-display text-2xl italic text-ink">
            That entry didn&apos;t post.
          </h1>
          <p className="mb-6 max-w-sm text-sm text-ink-soft">
            Nothing was written to the ledger — it&apos;s safe to try again. If this keeps
            happening, the error has been logged for review.
          </p>
          <Button onClick={() => reset()}>Try again</Button>
          {error.digest && (
            <p className="mt-4 text-xs text-ink-soft">Reference: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
