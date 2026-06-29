import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { createBudget } from '@/lib/budget';
import { assertAccountsInOrg } from '@/lib/ownership';

const lineSchema = z.object({
  accountId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  amountCents: z.number().int(),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  year: z.number().int().min(2000).max(2100),
  lines: z.array(lineSchema).min(1),
});

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const budgets = await prisma.budget.findMany({
    where: { organizationId: org.id },
    orderBy: { year: 'desc' },
  });
  return NextResponse.json({ budgets });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await assertAccountsInOrg(org.id, parsed.data.lines.map((l) => l.accountId));
    const budget = await createBudget({ organizationId: org.id, ...parsed.data });
    return NextResponse.json({ budget }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not create budget.' }, { status: 400 });
  }
}
