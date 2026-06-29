import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

const STATUS_TONE: Record<string, 'neutral' | 'debit' | 'credit' | 'warning'> = {
  DRAFT: 'neutral',
  OPEN: 'warning',
  PARTIALLY_PAID: 'warning',
  PAID: 'credit',
  VOID: 'debit',
};

export default async function BillsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const bills = await prisma.bill.findMany({
    where: { organizationId: org.id },
    include: { vendor: true },
    orderBy: { billDate: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Bills</h1>
          <p className="text-sm text-ink-soft">What you owe vendors.</p>
        </div>
        <Link href="/dashboard/bills/new">
          <Button>+ Enter bill</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Vendor</th>
                <th className="px-5 py-2.5 text-left">Due</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-right">Total</th>
                <th className="px-5 py-2.5 text-right">Balance due</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="ledger-rule">
                  <td className="px-5 py-2.5">
                    <Link href={`/dashboard/bills/${bill.id}`} className="text-ink hover:underline">
                      {bill.vendor.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {bill.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge tone={STATUS_TONE[bill.status]}>{bill.status.replace('_', ' ').toLowerCase()}</Badge>
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(bill.totalCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(bill.totalCents - bill.amountPaidCents)}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                    No bills yet.
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
