import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { StartReconciliationForm } from '@/components/start-reconciliation-form';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/utils';

export default async function ReconcilePage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [cashAccounts, reconciliations] = await Promise.all([
    prisma.account.findMany({ where: { organizationId: org.id, isCashAccount: true, archived: false } }),
    prisma.reconciliation.findMany({
      where: { organizationId: org.id },
      include: { account: true },
      orderBy: { statementDate: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Reconcile</h1>
        <p className="text-sm text-ink-soft">
          Match cleared transactions against a bank statement, then lock them in.
        </p>
      </div>

      <Card>
        <CardBody>
          <StartReconciliationForm accounts={cashAccounts} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Account</th>
                <th className="px-5 py-2.5 text-left">Statement date</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-right">Ending balance</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r) => (
                <tr key={r.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">
                    {r.status === 'IN_PROGRESS' ? (
                      <Link href={`/dashboard/reconcile/${r.id}`} className="hover:underline">
                        {r.account.name}
                      </Link>
                    ) : (
                      r.account.name
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {r.statementDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge tone={r.status === 'COMPLETED' ? 'credit' : 'warning'}>
                      {r.status === 'COMPLETED' ? 'reconciled' : 'in progress'}
                    </Badge>
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(r.statementEndingCents)}
                  </td>
                </tr>
              ))}
              {reconciliations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    No reconciliations yet.
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
