import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { BudgetGridForm } from '@/components/budget-grid-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default async function NewBudgetPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const accounts = await prisma.account.findMany({
    where: { organizationId: org.id, archived: false, type: { in: ['REVENUE', 'EXPENSE'] } },
    orderBy: { code: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">New budget</h1>
        <p className="text-sm text-ink-soft">Enter a monthly target for any account — leave the rest blank.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly targets</CardTitle>
        </CardHeader>
        <CardBody>
          <BudgetGridForm accounts={accounts} />
        </CardBody>
      </Card>
    </div>
  );
}
