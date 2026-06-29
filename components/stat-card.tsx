import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/utils';

export function StatCard({
  label,
  cents,
  tone = 'neutral',
}: {
  label: string;
  cents: number;
  tone?: 'neutral' | 'debit' | 'credit';
}) {
  return (
    <div className="rounded-sm border border-rule bg-surface px-5 py-4 shadow-ledger">
      <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <p
        className={cn(
          'tabular mt-2 font-mono text-2xl',
          tone === 'debit' && 'text-debit',
          tone === 'credit' && 'text-credit',
          tone === 'neutral' && 'text-ink'
        )}
      >
        {formatCents(cents)}
      </p>
    </div>
  );
}
