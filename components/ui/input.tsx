import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-sm border border-rule-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brass focus:outline-none',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
