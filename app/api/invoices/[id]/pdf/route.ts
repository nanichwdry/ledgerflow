import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { renderInvoicePdfBuffer } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: { customer: true, lines: true },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const buffer = await renderInvoicePdfBuffer(org.name, {
    ...invoice,
    customerName: invoice.customer.name,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
