import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  region: z.string().max(80).optional(),
  ratePercent: z.number().min(0).max(100),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const taxRates = await prisma.taxRate.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ taxRates });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const taxRate = await prisma.taxRate.create({ data: { organizationId: org.id, ...parsed.data } });
    return NextResponse.json({ taxRate }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'A tax rate with that name already exists.' }, { status: 409 });
    }
    throw err;
  }
}
