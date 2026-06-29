import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/utils';

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: params.token },
    include: { customer: true, lines: true, organization: true },
  });
  if (!invoice || invoice.status === 'DRAFT') notFound();

  const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;

  return (
    <main className="flex min-h-screen justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-xl italic text-ink">{invoice.organization.name}</span>
          <Badge tone={invoice.status === 'PAID' ? 'credit' : 'warning'}>
            {invoice.status.replace('_', ' ').toLowerCase()}
          </Badge>
        </div>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-soft">Invoice</p>
                <p className="font-display text-2xl italic text-ink">#{invoice.number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-ink-soft">Due</p>
                <p className="text-ink">
                  {invoice.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm text-ink-soft">Billed to {invoice.customer.name}</p>

            <table className="w-full text-sm">
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="ledger-rule">
                    <td className="py-2 text-ink">{line.description}</td>
                    <td className="py-2 text-right text-ink-soft">{line.quantity}</td>
                    <td className="tabular py-2 text-right font-mono text-ink">
                      {formatCents(line.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span>{formatCents(invoice.subtotalCents)}</span>
              </div>
              {invoice.taxCents > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <span>Tax</span>
                  <span>{formatCents(invoice.taxCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-rule-strong pt-2 font-mono text-ink">
                <span className="font-display italic">Total</span>
                <span>{formatCents(invoice.totalCents)}</span>
              </div>
              {invoice.amountPaidCents > 0 && (
                <div className="flex justify-between text-credit">
                  <span>Paid</span>
                  <span>{formatCents(invoice.amountPaidCents)}</span>
                </div>
              )}
            </div>

            {invoice.notes && <p className="mt-4 text-sm text-ink-soft">{invoice.notes}</p>}

            {balanceDueCents > 0 && invoice.stripePaymentLinkUrl && (
              <a href={invoice.stripePaymentLinkUrl} className="mt-6 block">
                <Button className="w-full">Pay {formatCents(balanceDueCents)} now</Button>
              </a>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
