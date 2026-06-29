import { formatCents } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Row = {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  balanceCents: number;
  isBankFeed?: boolean;
};

const GROUP_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const GROUP_LABEL: Record<string, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

export function AccountTree({ accounts }: { accounts: Row[] }) {
  return (
    <div className="divide-y divide-rule">
      {GROUP_ORDER.map((type) => {
        const rows = accounts.filter((a) => a.type === type);
        if (rows.length === 0) return null;
        const subtotal = rows.reduce((s, r) => s + r.balanceCents, 0);

        return (
          <div key={type} className="py-3">
            <p className="px-5 text-xs uppercase tracking-wider text-ink-soft">
              {GROUP_LABEL[type]}
            </p>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="ledger-rule">
                    <td className="w-16 px-5 py-2 font-mono text-ink-soft">{row.code}</td>
                    <td className="py-2 text-ink">
                      {row.name}
                      {row.isBankFeed && (
                        <Badge tone="warning" className="ml-2">
                          live feed
                        </Badge>
                      )}
                    </td>
                    <td className="tabular px-5 py-2 text-right font-mono text-ink">
                      {formatCents(row.balanceCents)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="px-5 py-2 text-right text-xs text-ink-soft">
                    Subtotal
                  </td>
                  <td className="tabular px-5 py-2 text-right font-mono text-sm text-ink">
                    {formatCents(subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
