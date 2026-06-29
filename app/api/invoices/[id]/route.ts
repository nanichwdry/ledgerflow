import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: {
      customer: true,
      lines: { include: { revenueAccount: true, inventoryItem: true } },
      payments: { include: { depositAccount: true } },
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  return NextResponse.json({ invoice });
}
