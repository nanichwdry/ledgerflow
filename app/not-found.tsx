import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">404</p>
      <h1 className="mb-4 font-display text-2xl italic text-ink">No entry here.</h1>
      <p className="mb-6 max-w-sm text-sm text-ink-soft">
        Whatever you were looking for isn&apos;t on this page — it may have moved or been
        removed.
      </p>
      <Link href="/dashboard">
        <Button>Back to overview</Button>
      </Link>
    </main>
  );
}
