import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { PayrollRunForm } from '@/components/payroll-run-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default async function NewPayrollRunPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [cashAccounts, expenseAccounts, liabilityAccounts] = await Promise.all([
    prisma.account.findMany({ where: { organizationId: org.id, isCashAccount: true, archived: false } }),
    prisma.account.findMany({
      where: { organizationId: org.id, type: 'EXPENSE', archived: false },
      orderBy: { code: 'asc' },
    }),
    prisma.account.findMany({
      where: { organizationId: org.id, type: 'LIABILITY', archived: false },
      orderBy: { code: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Post payroll run</h1>
        <p className="text-sm text-ink-soft">
          For a run already processed by your payroll provider — this records the journal
          entry, it doesn&apos;t calculate any tax.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <PayrollRunForm
            cashAccounts={cashAccounts}
            expenseAccounts={expenseAccounts}
            liabilityAccounts={liabilityAccounts}
          />
        </CardBody>
      </Card>
    </div>
  );
}
