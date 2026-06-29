import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { createBill } from '@/lib/bills';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().min(0),
  expenseAccountId: z.string().min(1),
  inventoryItemId: z.string().optional(),
  classId: z.string().optional(),
});

const createSchema = z.object({
  vendorId: z.string().min(1),
  billDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const bills = await prisma.bill.findMany({
    where: { organizationId: org.id },
    include: { vendor: true },
    orderBy: { billDate: 'desc' },
  });
  return NextResponse.json({ bills });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const bill = await createBill({ organizationId: org.id, ...parsed.data });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create bill', err);
    return NextResponse.json({ error: err.message ?? 'Could not enter bill' }, { status: 400 });
  }
}
