import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentMembership } from '@/lib/supabase/server';
import { postPayrollRun } from '@/lib/payroll';
import { logAudit } from '@/lib/audit';

const createSchema = z.object({
  payDate: z.coerce.date(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notes: z.string().optional(),
  grossWagesCents: z.number().int().positive(),
  employerTaxesCents: z.number().int().min(0).optional(),
  netPayCents: z.number().int().positive(),
  paidFromAccountId: z.string().min(1),
  wagesExpenseAccountId: z.string().min(1),
  taxExpenseAccountId: z.string().optional(),
  liabilitiesAccountId: z.string().optional(),
});

export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const runs = await prisma.payrollRun.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { payDate: 'desc' },
  });
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const run = await postPayrollRun({ organizationId: membership.organizationId, ...parsed.data });
    await logAudit(prisma, {
      organizationId: membership.organizationId,
      actorUserId: membership.userId ?? 'unknown',
      actorEmail: membership.email,
      entityType: 'PayrollRun',
      entityId: run.id,
      action: 'CREATE',
      summary: `Posted payroll run for pay date ${parsed.data.payDate.toLocaleDateString('en-US')}`,
      after: run,
    });
    return NextResponse.json({ run }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not post payroll run.' }, { status: 400 });
  }
}
