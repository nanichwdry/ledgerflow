import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const customer = await prisma.customer.create({
    data: { organizationId: org.id, ...parsed.data, email: parsed.data.email || undefined },
  });
  return NextResponse.json({ customer }, { status: 201 });
}
