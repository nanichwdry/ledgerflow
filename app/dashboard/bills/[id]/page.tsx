import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayBillForm } from '@/components/pay-bill-form';
import { formatCents } from '@/lib/utils';

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [bill, cashAccounts] = await Promise.all([
    prisma.bill.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: {
        vendor: true,
        lines: true,
        payments: { include: { paidFromAccount: true } },
      },
    }),
    prisma.account.findMany({ where: { organizationId: org.id, isCashAccount: true, archived: false } }),
  ]);
  if (!bill) notFound();

  const balanceDueCents = bill.totalCents - bill.amountPaidCents;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">
            {bill.vendor.name}
            {bill.reference && <span className="text-ink-soft"> · #{bill.reference}</span>}
          </h1>
          <p className="text-sm text-ink-soft">
            Due {bill.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Badge tone={bill.status === 'PAID' ? 'credit' : bill.status === 'VOID' ? 'debit' : 'warning'}>
          {bill.status.replace('_', ' ').toLowerCase()}
        </Badge>
      </div>

      {bill.status !== 'PAID' && bill.status !== 'VOID' && (
        <PayBillForm billId={bill.id} balanceDueCents={balanceDueCents} cashAccounts={cashAccounts} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {bill.lines.map((line) => (
                <tr key={line.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">{line.description}</td>
                  <td className="px-5 py-2.5 text-right text-ink-soft">{line.quantity}</td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(line.unitCostCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(line.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-rule-strong px-5 py-3 text-sm">
            <span className="font-mono text-ink">Total {formatCents(bill.totalCents)}</span>
          </div>
        </CardBody>
      </Card>

      {bill.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {bill.payments.map((p) => (
                  <tr key={p.id} className="ledger-rule">
                    <td className="px-5 py-2.5 text-ink-soft">
                      {p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{p.paidFromAccount.name}</td>
                    <td className="tabular px-5 py-2.5 text-right font-mono text-debit">
                      −{formatCents(p.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
