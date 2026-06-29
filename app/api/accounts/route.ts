import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

const createSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(120),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().optional().nullable(),
});

const NORMAL_BALANCE: Record<string, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  REVENUE: 'CREDIT',
};

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { code: 'asc' },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const account = await prisma.account.create({
      data: {
        organizationId: org.id,
        code: parsed.data.code,
        name: parsed.data.name,
        type: parsed.data.type,
        normalBalance: NORMAL_BALANCE[parsed.data.type],
        parentId: parsed.data.parentId || null,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Account code already in use' }, { status: 409 });
    }
    throw err;
  }
}
