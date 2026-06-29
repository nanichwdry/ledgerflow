import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { BillForm } from '@/components/bill-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default async function NewBillPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [vendors, expenseAccounts, inventoryItems, classes] = await Promise.all([
    prisma.vendor.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({
      where: { organizationId: org.id, type: 'EXPENSE', archived: false },
      orderBy: { code: 'asc' },
    }),
    prisma.inventoryItem.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.class.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Enter bill</h1>
        <p className="text-sm text-ink-soft">Posts to Accounts Payable immediately.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <BillForm
            vendors={vendors}
            expenseAccounts={expenseAccounts}
            inventoryItems={inventoryItems.map((i) => ({ id: i.id, sku: i.sku, name: i.name }))}
            classes={classes}
          />
        </CardBody>
      </Card>
    </div>
  );
}
