import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const bill = await prisma.bill.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: {
      vendor: true,
      lines: { include: { expenseAccount: true, inventoryItem: true } },
      payments: { include: { paidFromAccount: true } },
      receipt: true,
    },
  });
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  return NextResponse.json({ bill });
}
