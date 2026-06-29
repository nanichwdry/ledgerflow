import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'debit' | 'credit' | 'warning';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide',
        tone === 'neutral' && 'bg-rule/40 text-ink-soft',
        tone === 'debit' && 'bg-debit/10 text-debit',
        tone === 'credit' && 'bg-credit/10 text-credit',
        tone === 'warning' && 'bg-brass/15 text-brass-dark',
        className
      )}
      {...props}
    />
  );
}
