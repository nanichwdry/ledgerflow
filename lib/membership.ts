import { prisma } from '@/lib/prisma';
import type { MembershipRole } from '@prisma/client';

export type CurrentMembership = {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string;
  role: MembershipRole;
  organization: { id: string; name: string; ownerId: string; currency: string };
};

/**
 * Resolves the current Supabase user to their active Membership, handling
 * three cases in order:
 *   1. Already an active member somewhere — return it.
 *   2. Was invited by email before ever signing up — activate that invite.
 *   3. Brand new — create their own organization as OWNER (and backfill a
 *      Membership for any pre-existing organization created before this
 *      multi-user system existed, so upgrading never orphans someone's books).
 */
export async function resolveMembership(user: { id: string; email?: string | null }) {
  let membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { organization: true },
  });
  if (membership) return membership;

  // Legacy orgs created before Membership existed — backfill their OWNER row.
  const legacyOrg = await prisma.organization.findUnique({ where: { ownerId: user.id } });
  if (legacyOrg) {
    membership = await prisma.membership.upsert({
      where: { organizationId_email: { organizationId: legacyOrg.id, email: user.email ?? '' } },
      update: { userId: user.id, status: 'ACTIVE', role: 'OWNER', joinedAt: new Date() },
      create: {
        organizationId: legacyOrg.id,
        userId: user.id,
        email: user.email ?? '',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      include: { organization: true },
    });
    return membership;
  }

  if (user.email) {
    const invited = await prisma.membership.findFirst({
      where: { email: user.email, status: 'INVITED' },
      include: { organization: true },
    });
    if (invited) {
      return prisma.membership.update({
        where: { id: invited.id },
        data: { userId: user.id, status: 'ACTIVE', joinedAt: new Date() },
        include: { organization: true },
      });
    }
  }

  const { seedDefaultChartOfAccounts } = await import('@/lib/seed-accounts');
  const org = await prisma.organization.create({
    data: { ownerId: user.id, name: user.email?.split('@')[0] ?? 'My Books' },
  });
  await seedDefaultChartOfAccounts(org.id);

  return prisma.membership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      email: user.email ?? '',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
    include: { organization: true },
  });
}

// ---------- Permission predicates ----------
// Deliberately simple, four-role matrix. Applied at the most sensitive
// boundaries (team management, integration credentials, deletions, full
// financial reports) — see README for what's NOT yet individually gated.

export function canManageTeam(role: MembershipRole) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canManageIntegrations(role: MembershipRole) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canViewReports(role: MembershipRole) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT';
}

export function canDeleteEntries(role: MembershipRole) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT';
}

export function canManageChartOfAccounts(role: MembershipRole) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT';
}

export class PermissionError extends Error {
  constructor(action: string) {
    super(`Your role doesn't have permission to ${action}.`);
  }
}
