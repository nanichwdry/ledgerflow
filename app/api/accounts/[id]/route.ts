import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: parsed.data,
  });
  return NextResponse.json({ account: updated });
}
