'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';

export function DateRangePicker({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: 'from' | 'to', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        defaultValue={searchParams.get('from') ?? defaultFrom}
        onChange={(e) => update('from', e.target.value)}
        className="w-40"
      />
      <span className="text-ink-soft">to</span>
      <Input
        type="date"
        defaultValue={searchParams.get('to') ?? defaultTo}
        onChange={(e) => update('to', e.target.value)}
        className="w-40"
      />
    </div>
  );
}
