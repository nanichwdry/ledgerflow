import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { createInvoice } from '@/lib/invoices';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
  revenueAccountId: z.string().min(1),
  inventoryItemId: z.string().optional(),
  classId: z.string().optional(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
  taxCents: z.number().int().min(0).optional(),
  taxRateId: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
    include: { customer: true },
    orderBy: { number: 'desc' },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const invoice = await createInvoice({ organizationId: org.id, ...parsed.data });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create invoice', err);
    return NextResponse.json({ error: err.message ?? 'Could not create that invoice.' }, { status: 400 });
  }
}
