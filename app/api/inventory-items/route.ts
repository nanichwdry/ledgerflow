import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getSystemAccount, SYSTEM_ACCOUNT_CODES } from '@/lib/system-accounts';

const createSchema = z.object({
  sku: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  defaultSaleCents: z.number().int().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [inventoryAccount, cogsAccount] = await Promise.all([
    getSystemAccount(org.id, SYSTEM_ACCOUNT_CODES.INVENTORY),
    getSystemAccount(org.id, SYSTEM_ACCOUNT_CODES.COST_OF_GOODS_SOLD),
  ]);

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        ...parsed.data,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'SKU already in use' }, { status: 409 });
    }
    throw err;
  }
}
