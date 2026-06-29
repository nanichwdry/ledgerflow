import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { recordInvoicePayment } from '@/lib/invoices';

const schema = z.object({
  amountCents: z.number().int().positive(),
  date: z.coerce.date(),
  depositAccountId: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (invoice.status === 'DRAFT') {
    return NextResponse.json({ error: 'Send the invoice before recording a payment.' }, { status: 400 });
  }

  try {
    await recordInvoicePayment(invoice.id, { ...parsed.data, method: 'manual' });
    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    return NextResponse.json({ invoice: updated });
  } catch (err: any) {
    console.error('Failed to record invoice payment', err);
    return NextResponse.json({ error: err.message ?? 'Could not record that payment.' }, { status: 400 });
  }
}
