import { getCurrentMembership } from '@/lib/supabase/server';
import { listMembers } from '@/lib/team';
import { canManageTeam } from '@/lib/membership';
import { TeamManager } from '@/components/team-manager';
import { Card, CardBody } from '@/components/ui/card';

export default async function TeamPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  if (!canManageTeam(membership.role)) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl italic text-ink">Team</h1>
        <p className="text-sm text-ink-soft">Only an owner or admin can manage the team.</p>
      </div>
    );
  }

  const members = await listMembers(membership.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Team</h1>
        <p className="text-sm text-ink-soft">
          Invite people by email — they get access automatically when they sign in with that
          address. Roles: admins manage everything, accountants handle the books and reports,
          employees get day-to-day entry.
        </p>
      </div>

      <Card>
        <CardBody>
          <TeamManager members={members} />
        </CardBody>
      </Card>
    </div>
  );
}
