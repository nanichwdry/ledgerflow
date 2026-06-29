import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentMembership } from '@/lib/supabase/server';
import { completeReconciliation } from '@/lib/reconciliation';
import { logAudit } from '@/lib/audit';

const schema = z.object({ clearedLineIds: z.array(z.string().min(1)).min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
    include: { account: true },
  });
  if (!reconciliation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const completed = await completeReconciliation(reconciliation.id, parsed.data.clearedLineIds);
    await logAudit(prisma, {
      organizationId: membership.organizationId,
      actorUserId: membership.userId ?? 'unknown',
      actorEmail: membership.email,
      entityType: 'Reconciliation',
      entityId: completed.id,
      action: 'UPDATE',
      summary: `Reconciled ${reconciliation.account.name} through ${reconciliation.statementDate.toLocaleDateString('en-US')}`,
      after: completed,
    });
    return NextResponse.json({ reconciliation: completed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not complete reconciliation.' }, { status: 400 });
  }
}
