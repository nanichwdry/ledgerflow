import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = 'primary', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-ink text-paper hover:bg-panel',
        variant === 'secondary' &&
          'border border-rule-strong bg-surface text-ink hover:border-brass hover:text-brass-dark',
        variant === 'ghost' && 'text-ink-soft hover:text-ink',
        variant === 'danger' && 'border border-debit/40 text-debit hover:bg-debit/5',
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';
