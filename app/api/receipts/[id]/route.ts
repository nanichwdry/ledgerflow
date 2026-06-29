import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getReceiptSignedUrl } from '@/lib/storage';
import { convertReceiptToBill } from '@/lib/receipts';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const receipt = await prisma.receipt.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

  const imageUrl = await getReceiptSignedUrl(receipt.storagePath).catch(() => null);
  return NextResponse.json({ receipt, imageUrl });
}

const confirmSchema = z.object({
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  billDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitCostCents: z.number().int().min(0),
        expenseAccountId: z.string().min(1),
      })
    )
    .min(1),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = confirmSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const receipt = await prisma.receipt.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

  const bill = await convertReceiptToBill(receipt.id, parsed.data);
  return NextResponse.json({ bill });
}
