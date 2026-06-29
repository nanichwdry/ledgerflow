import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

const STATUS_TONE: Record<string, 'neutral' | 'debit' | 'credit' | 'warning'> = {
  DRAFT: 'neutral',
  SENT: 'warning',
  PARTIALLY_PAID: 'warning',
  PAID: 'credit',
  VOID: 'debit',
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { customerId?: string };
}) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id, customerId: searchParams.customerId || undefined },
    include: { customer: true },
    orderBy: { number: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Invoices</h1>
          <p className="text-sm text-ink-soft">Bill customers and track what&apos;s outstanding.</p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>+ New invoice</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">#</th>
                <th className="px-5 py-2.5 text-left">Customer</th>
                <th className="px-5 py-2.5 text-left">Due</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-right">Total</th>
                <th className="px-5 py-2.5 text-right">Balance due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="ledger-rule">
                  <td className="px-5 py-2.5">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="text-ink hover:underline">
                      #{inv.number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink">{inv.customer.name}</td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {inv.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status.replace('_', ' ').toLowerCase()}</Badge>
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(inv.totalCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(inv.totalCents - inv.amountPaidCents)}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-soft">
                    No invoices yet.
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
