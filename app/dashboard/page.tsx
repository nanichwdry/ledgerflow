import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getBalanceSheet, getProfitAndLoss } from '@/lib/ledger';
import { StatCard } from '@/components/stat-card';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

export default async function DashboardOverviewPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [balanceSheet, ytdPnl, plaidItemCount, recentTransactions] = await Promise.all([
    getBalanceSheet(org.id),
    getProfitAndLoss(org.id, new Date(new Date().getFullYear(), 0, 1)),
    prisma.plaidItem.count({ where: { organizationId: org.id } }),
    prisma.plaidTransaction.findMany({
      where: { plaidAccount: { plaidItem: { organizationId: org.id } } },
      include: { categorizedAccount: true },
      orderBy: { date: 'desc' },
      take: 6,
    }),
  ]);

  const cashCents = balanceSheet.assets
    .filter((a) => a.balanceCents !== 0)
    .reduce((s, a) => s + a.balanceCents, 0);

  if (plaidItemCount === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h1 className="font-display text-2xl italic text-ink">No bank feeds connected yet</h1>
        <p className="mt-2 max-w-sm text-ink-soft">
          Connect a checking, savings, or card account to start posting transactions to your
          ledger automatically.
        </p>
        <Link href="/dashboard/banks" className="mt-5">
          <Button>Connect a bank account</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Overview</h1>
        <p className="text-sm text-ink-soft">{org.name}&apos;s books, as of today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total assets" cents={balanceSheet.totalAssets} />
        <StatCard label="Total liabilities" cents={balanceSheet.totalLiabilities} tone="debit" />
        <StatCard
          label="Net income (YTD)"
          cents={ytdPnl.netIncomeCents}
          tone={ytdPnl.netIncomeCents >= 0 ? 'credit' : 'debit'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <Link href="/dashboard/transactions" className="text-sm text-brass-dark hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {recentTransactions.map((t) => (
                <tr key={t.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink-soft">
                    {t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5 text-ink">{t.merchantName ?? t.name}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{t.categorizedAccount?.name}</td>
                  <td
                    className={`tabular px-5 py-2.5 text-right font-mono ${
                      t.amountCents > 0 ? 'text-debit' : 'text-credit'
                    }`}
                  >
                    {t.amountCents > 0 ? '−' : '+'}
                    {formatCents(Math.abs(t.amountCents))}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-ink-soft">
                    No transactions synced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
