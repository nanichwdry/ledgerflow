import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const classes = await prisma.class.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const cls = await prisma.class.create({ data: { organizationId: org.id, ...parsed.data } });
    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'A class with that name already exists.' }, { status: 409 });
    }
    throw err;
  }
}
