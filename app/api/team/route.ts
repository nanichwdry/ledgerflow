import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentMembership } from '@/lib/supabase/server';
import { listMembers, inviteMember } from '@/lib/team';
import { canManageTeam } from '@/lib/membership';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'EMPLOYEE']),
});

export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canManageTeam(membership.role)) {
    return NextResponse.json({ error: "Your role can't manage the team." }, { status: 403 });
  }

  const members = await listMembers(membership.organizationId);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canManageTeam(membership.role)) {
    return NextResponse.json({ error: "Your role can't invite members." }, { status: 403 });
  }

  const parsed = inviteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const member = await inviteMember({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: membership.userId ?? 'unknown',
      invitedByEmail: membership.email,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Could not invite that person.' }, { status: 400 });
  }
}
