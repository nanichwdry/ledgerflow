import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getBudgetVsActual } from '@/lib/budget';
import { Card, CardBody } from '@/components/ui/card';
import { formatCents, cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function BudgetDetailPage({ params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const budget = await prisma.budget.findFirst({ where: { id: params.id, organizationId: org.id } });
  if (!budget) notFound();

  const rows = await getBudgetVsActual(budget.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">{budget.name}</h1>
        <p className="text-sm text-ink-soft">Budget vs. actual, {budget.year}</p>
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="sticky left-0 bg-surface px-3 py-2 text-left">Account</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-3 py-2 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.accountId} className="ledger-rule">
                  <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2 text-ink">
                    {row.accountCode} · {row.accountName}
                  </td>
                  {row.monthly.map((m) => (
                    <td key={m.month} className="px-3 py-2 text-right">
                      <div className="tabular font-mono text-xs text-ink-soft">{formatCents(m.budgetCents)}</div>
                      <div
                        className={cn(
                          'tabular font-mono text-xs',
                          m.varianceCents > 0 ? 'text-debit' : m.varianceCents < 0 ? 'text-credit' : 'text-ink'
                        )}
                      >
                        {formatCents(m.actualCents)}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="tabular font-mono text-xs text-ink-soft">
                      {formatCents(row.totalBudgetCents)}
                    </div>
                    <div className="tabular font-mono text-xs font-bold text-ink">
                      {formatCents(row.totalActualCents)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <p className="text-xs text-ink-soft">
        Each cell shows budget (top, gray) over actual (bottom) — red actual means over budget on an
        expense or under on revenue; green means the opposite.
      </p>
    </div>
  );
}
