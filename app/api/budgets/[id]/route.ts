import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { updateBudgetLines } from '@/lib/budget';
import { assertAccountsInOrg } from '@/lib/ownership';

const lineSchema = z.object({
  accountId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  amountCents: z.number().int(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const budget = await prisma.budget.findFirst({
    where: { id: params.id, organizationId: org.id },
    include: { lines: { include: { account: true } } },
  });
  if (!budget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ budget });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = z.object({ lines: z.array(lineSchema).min(1) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const budget = await prisma.budget.findFirst({ where: { id: params.id, organizationId: org.id } });
  if (!budget) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await assertAccountsInOrg(org.id, parsed.data.lines.map((l) => l.accountId));
  const updated = await updateBudgetLines(budget.id, parsed.data.lines);
  return NextResponse.json({ budget: updated });
}
