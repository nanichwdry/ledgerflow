import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getTrialBalance } from '@/lib/ledger';
import { AccountTree } from '@/components/account-tree';
import { NewAccountForm } from '@/components/new-account-form';
import { Card, CardBody } from '@/components/ui/card';

export default async function AccountsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const rows = await getTrialBalance(org.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Chart of accounts</h1>
          <p className="text-sm text-ink-soft">
            Every account here can receive journal lines, manual or synced.
          </p>
        </div>
      </div>

      <NewAccountForm />

      <Card>
        <CardBody className="p-0">
          <AccountTree accounts={rows} />
        </CardBody>
      </Card>
    </div>
  );
}
