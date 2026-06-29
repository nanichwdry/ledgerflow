import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { ...parsed.data, email: parsed.data.email || undefined },
  });
  return NextResponse.json({ customer: updated });
}
