'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCents } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Account = { id: string; code: string; name: string };

export function TransactionRow({
  transaction,
  accounts,
}: {
  transaction: {
    id: string;
    date: string;
    name: string;
    merchantName: string | null;
    amountCents: number;
    pending: boolean;
    bankAccountName: string;
    categorizedAccountId: string | null;
    categorizedAccountCode: string | null;
    isUncategorized: boolean;
  };
  accounts: Account[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function recategorize(accountId: string) {
    setSaving(true);
    await fetch(`/api/transactions/${transaction.id}/categorize`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
    setSaving(false);
    router.refresh();
  }

  const isOutflow = transaction.amountCents > 0;

  return (
    <tr className="ledger-rule">
      <td className="whitespace-nowrap px-5 py-2.5 text-sm text-ink-soft">
        {new Date(transaction.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-5 py-2.5 text-sm text-ink">
        {transaction.merchantName ?? transaction.name}
        {transaction.pending && (
          <Badge tone="warning" className="ml-2">
            pending
          </Badge>
        )}
      </td>
      <td className="px-5 py-2.5 text-sm text-ink-soft">{transaction.bankAccountName}</td>
      <td className="px-5 py-2.5">
        <Select
          value={transaction.categorizedAccountId ?? ''}
          onChange={(e) => recategorize(e.target.value)}
          disabled={saving}
          className={transaction.isUncategorized ? 'border-brass text-brass-dark' : undefined}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </Select>
      </td>
      <td
        className={`tabular px-5 py-2.5 text-right font-mono text-sm ${
          isOutflow ? 'text-debit' : 'text-credit'
        }`}
      >
        {isOutflow ? '−' : '+'}
        {formatCents(Math.abs(transaction.amountCents))}
      </td>
    </tr>
  );
}
