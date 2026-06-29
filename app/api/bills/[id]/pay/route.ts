import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { payBill } from '@/lib/bills';

const schema = z.object({
  amountCents: z.number().int().positive(),
  date: z.coerce.date(),
  paidFromAccountId: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const bill = await prisma.bill.findFirst({ where: { id: params.id, organizationId: org.id } });
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  try {
    await payBill(bill.id, parsed.data);
    const updated = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id } });
    return NextResponse.json({ bill: updated });
  } catch (err: any) {
    console.error('Failed to record bill payment', err);
    return NextResponse.json({ error: err.message ?? 'Could not record that payment.' }, { status: 400 });
  }
}
