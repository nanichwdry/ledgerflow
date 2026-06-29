import { getCurrentMembership } from '@/lib/supabase/server';
import { listAuditLog } from '@/lib/audit';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ACTION_TONE: Record<string, 'neutral' | 'credit' | 'debit' | 'warning'> = {
  CREATE: 'credit',
  UPDATE: 'warning',
  DELETE: 'debit',
};

export default async function AuditLogPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const entries = await listAuditLog(membership.organizationId, { limit: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Audit log</h1>
        <p className="text-sm text-ink-soft">
          A running history of who changed what — journal entries, reconciliations, payroll, and
          more.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">When</th>
                <th className="px-5 py-2.5 text-left">Who</th>
                <th className="px-5 py-2.5 text-left">Action</th>
                <th className="px-5 py-2.5 text-left">What</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="ledger-rule">
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-soft">
                    {e.createdAt.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">{e.actorEmail ?? 'system'}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={ACTION_TONE[e.action] ?? 'neutral'}>{e.action.toLowerCase()}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-ink">{e.summary}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
