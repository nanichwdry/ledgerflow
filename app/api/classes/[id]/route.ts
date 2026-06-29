import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const schema = z.object({ archived: z.boolean().optional(), name: z.string().min(1).max(80).optional() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cls = await prisma.class.findFirst({ where: { id: params.id, organizationId: org.id } });
  if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.class.update({ where: { id: cls.id }, data: parsed.data });
  return NextResponse.json({ class: updated });
}
