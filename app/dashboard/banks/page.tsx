import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { SyncButton } from '@/components/sync-button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function BanksPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const items = await prisma.plaidItem.findMany({
    where: { organizationId: org.id },
    include: { accounts: { include: { linkedAccount: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Bank feeds</h1>
          <p className="text-sm text-ink-soft">
            Every linked account gets its own ledger account and posts automatically.
          </p>
        </div>
        <PlaidLinkButton />
      </div>

      {items.length === 0 && (
        <Card>
          <CardBody className="text-center text-ink-soft">
            No accounts connected yet — use the button above to link your first one.
          </CardBody>
        </Card>
      )}

      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{item.institutionName ?? 'Connected institution'}</CardTitle>
              {item.status === 'ERROR' && <Badge tone="debit">needs attention</Badge>}
              {item.status === 'REAUTH_REQUIRED' && (
                <Badge tone="warning">reconnect required</Badge>
              )}
            </div>
            <SyncButton itemId={item.id} />
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {item.accounts.map((acc) => (
                  <tr key={acc.id} className="ledger-rule">
                    <td className="px-5 py-2.5 text-ink">{acc.linkedAccount.name}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{acc.subtype ?? acc.type}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-ink-soft">
                      {acc.linkedAccount.code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
