import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  defaultSaleCents: z.number().int().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const updated = await prisma.inventoryItem.update({ where: { id: item.id }, data: parsed.data });
  return NextResponse.json({ item: updated });
}
