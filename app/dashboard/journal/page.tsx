import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { JournalEntryForm } from '@/components/journal-entry-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/utils';

export default async function JournalPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [entries, accounts] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { organizationId: org.id },
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.account.findMany({
      where: { organizationId: org.id, archived: false },
      orderBy: { code: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Journal</h1>
        <p className="text-sm text-ink-soft">
          Post a manual entry, or scroll down to see every entry the ledger has recorded.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New entry</CardTitle>
        </CardHeader>
        <CardBody>
          <JournalEntryForm accounts={accounts} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All entries</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4 p-0 py-4">
          {entries.map((entry) => (
            <div key={entry.id} className="px-5">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm text-ink">{entry.memo}</p>
                <Badge tone={entry.source === 'PLAID_SYNC' ? 'warning' : 'neutral'}>
                  {entry.source === 'PLAID_SYNC' ? 'synced' : entry.source.toLowerCase()}
                </Badge>
                <span className="text-xs text-ink-soft">
                  {entry.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {entry.lines.map((line) => (
                    <tr key={line.id} className="ledger-rule">
                      <td className="py-1.5 pl-4 text-ink-soft">
                        {line.account.code} · {line.account.name}
                      </td>
                      <td className="tabular w-28 py-1.5 text-right font-mono text-debit">
                        {line.debitCents > 0 ? formatCents(line.debitCents) : ''}
                      </td>
                      <td className="tabular w-28 py-1.5 text-right font-mono text-credit">
                        {line.creditCents > 0 ? formatCents(line.creditCents) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="px-5 text-center text-ink-soft">No journal entries posted yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
