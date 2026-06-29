import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { startReconciliation } from '@/lib/reconciliation';

const createSchema = z.object({
  accountId: z.string().min(1),
  statementDate: z.coerce.date(),
  statementEndingCents: z.number().int(),
});

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId') ?? undefined;

  const reconciliations = await prisma.reconciliation.findMany({
    where: { organizationId: org.id, accountId },
    include: { account: true },
    orderBy: { statementDate: 'desc' },
  });
  return NextResponse.json({ reconciliations });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const reconciliation = await startReconciliation({ organizationId: org.id, ...parsed.data });
    return NextResponse.json({ reconciliation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not start reconciliation.' }, { status: 400 });
  }
}
