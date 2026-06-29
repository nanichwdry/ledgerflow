import { prisma } from '@/lib/prisma';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import type { MembershipRole } from '@prisma/client';

export async function listMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId, status: { not: 'REMOVED' } },
    orderBy: [{ status: 'asc' }, { invitedAt: 'asc' }],
  });
}

export async function inviteMember(input: {
  organizationId: string;
  organizationName: string;
  email: string;
  role: MembershipRole;
  invitedByUserId: string;
  invitedByEmail?: string;
}) {
  const existing = await prisma.membership.findUnique({
    where: { organizationId_email: { organizationId: input.organizationId, email: input.email } },
  });
  if (existing && existing.status !== 'REMOVED') {
    throw new Error('That person is already on the team or already invited.');
  }

  const membership = existing
    ? await prisma.membership.update({
        where: { id: existing.id },
        data: { status: 'INVITED', role: input.role, invitedByUserId: input.invitedByUserId },
      })
    : await prisma.membership.create({
        data: {
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          status: 'INVITED',
          invitedByUserId: input.invitedByUserId,
        },
      });

  if (isEmailConfigured()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await sendEmail({
      to: input.email,
      subject: `You've been invited to ${input.organizationName}'s books on LedgerFlow`,
      html: `<div style="font-family: sans-serif; color: #15261F;">
        <p>${input.invitedByEmail ?? 'Someone'} invited you to join <strong>${input.organizationName}</strong> on LedgerFlow as <strong>${input.role.toLowerCase()}</strong>.</p>
        <p>Sign up or sign in with this email address (<strong>${input.email}</strong>) at <a href="${appUrl}/login" style="color:#A8823C;">${appUrl}/login</a> to get access automatically.</p>
      </div>`,
    }).catch((err) => console.error('Invite email failed (membership was still created)', err));
  }

  return membership;
}

export async function updateMemberRole(membershipId: string, role: MembershipRole) {
  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  if (membership.role === 'OWNER') {
    throw new Error("The organization owner's role can't be changed.");
  }
  return prisma.membership.update({ where: { id: membershipId }, data: { role } });
}

export async function removeMember(membershipId: string) {
  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  if (membership.role === 'OWNER') {
    throw new Error('The organization owner cannot be removed.');
  }
  return prisma.membership.update({ where: { id: membershipId }, data: { status: 'REMOVED' } });
}
