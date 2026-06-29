import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { isEmailConfigured } from '@/lib/email';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvoiceActions } from '@/components/invoice-actions';
import { formatCents } from '@/lib/utils';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [invoice, cashAccounts] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: params.id, organizationId: org.id },
      include: { customer: true, lines: true, payments: { include: { depositAccount: true } } },
    }),
    prisma.account.findMany({ where: { organizationId: org.id, isCashAccount: true, archived: false } }),
  ]);
  if (!invoice) notFound();

  const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invoice/${invoice.publicToken}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Invoice #{invoice.number}</h1>
          <p className="text-sm text-ink-soft">{invoice.customer.name}</p>
        </div>
        <Badge tone={invoice.status === 'PAID' ? 'credit' : invoice.status === 'DRAFT' ? 'neutral' : 'warning'}>
          {invoice.status.replace('_', ' ').toLowerCase()}
        </Badge>
      </div>

      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        balanceDueCents={balanceDueCents}
        publicUrl={publicUrl}
        customerEmail={invoice.customer.email}
        cashAccounts={cashAccounts}
        lastEmailedAt={invoice.lastEmailedAt?.toISOString() ?? null}
        emailReady={isEmailConfigured()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">{line.description}</td>
                  <td className="px-5 py-2.5 text-right text-ink-soft">{line.quantity}</td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(line.unitPriceCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {formatCents(line.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-6 border-t border-rule-strong px-5 py-3 text-sm">
            <span className="text-ink-soft">Subtotal {formatCents(invoice.subtotalCents)}</span>
            <span className="text-ink-soft">Tax {formatCents(invoice.taxCents)}</span>
            <span className="font-mono text-ink">Total {formatCents(invoice.totalCents)}</span>
          </div>
        </CardBody>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="ledger-rule">
                    <td className="px-5 py-2.5 text-ink-soft">
                      {p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{p.depositAccount.name}</td>
                    <td className="px-5 py-2.5 text-ink-soft capitalize">{p.method}</td>
                    <td className="tabular px-5 py-2.5 text-right font-mono text-credit">
                      +{formatCents(p.amountCents)}
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
