import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

export default async function PayrollPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const runs = await prisma.payrollRun.findMany({
    where: { organizationId: org.id },
    orderBy: { payDate: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Payroll</h1>
          <p className="text-sm text-ink-soft">
            Records a payroll run a provider already processed — doesn&apos;t calculate tax itself.
          </p>
        </div>
        <Link href="/dashboard/payroll/new">
          <Button>+ Post payroll run</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Pay date</th>
                <th className="px-5 py-2.5 text-left">Period</th>
                <th className="px-5 py-2.5 text-right">Gross</th>
                <th className="px-5 py-2.5 text-right">Net pay</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">
                    {r.payDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {r.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                    {r.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(r.grossWagesCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(r.netPayCents)}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    No payroll runs yet.
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
