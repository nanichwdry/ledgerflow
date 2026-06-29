import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentMembership } from '@/lib/supabase/server';
import { updateMemberRole, removeMember } from '@/lib/team';
import { canManageTeam } from '@/lib/membership';

const patchSchema = z.object({ role: z.enum(['ADMIN', 'ACCOUNTANT', 'EMPLOYEE']) });

async function authorize(membershipId: string) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  if (!canManageTeam(membership.role)) {
    return { error: NextResponse.json({ error: "Your role can't manage the team." }, { status: 403 }) };
  }
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: membership.organizationId },
  });
  if (!target) return { error: NextResponse.json({ error: 'Member not found' }, { status: 404 }) };
  return { membership, target };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await authorize(params.id);
  if ('error' in auth) return auth.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const member = await updateMemberRole(params.id, parsed.data.role);
    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not update role.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await authorize(params.id);
  if ('error' in auth) return auth.error;

  try {
    await removeMember(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not remove member.' }, { status: 400 });
  }
}
