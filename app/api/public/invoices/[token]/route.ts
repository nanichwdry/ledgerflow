import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: params.token },
    include: { customer: true, lines: true },
  });
  if (!invoice || invoice.status === 'DRAFT') {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Deliberately minimal — no internal account ids, journal entries, or org details.
  return NextResponse.json({
    invoice: {
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      amountPaidCents: invoice.amountPaidCents,
      notes: invoice.notes,
      stripePaymentLinkUrl: invoice.stripePaymentLinkUrl,
      customerName: invoice.customer.name,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        amountCents: l.amountCents,
      })),
    },
  });
}
