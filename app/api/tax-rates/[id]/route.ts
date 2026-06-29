import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const schema = z.object({ archived: z.boolean().optional() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const taxRate = await prisma.taxRate.findFirst({ where: { id: params.id, organizationId: org.id } });
  if (!taxRate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.taxRate.update({ where: { id: taxRate.id }, data: parsed.data });
  return NextResponse.json({ taxRate: updated });
}
