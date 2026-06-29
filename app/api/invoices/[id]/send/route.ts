import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { sendInvoice } from '@/lib/invoices';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  try {
    await sendInvoice(invoice.id);
    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    return NextResponse.json({ invoice: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not send invoice' }, { status: 400 });
  }
}
