import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { InvoiceForm } from '@/components/invoice-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';

export default async function NewInvoicePage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const [customers, revenueAccounts, inventoryItems, classes, taxRates] = await Promise.all([
    prisma.customer.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({
      where: { organizationId: org.id, type: 'REVENUE', archived: false },
      orderBy: { code: 'asc' },
    }),
    prisma.inventoryItem.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.class.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
    prisma.taxRate.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">New invoice</h1>
        <p className="text-sm text-ink-soft">
          Saved as a draft first — sending it posts revenue to the ledger.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <InvoiceForm
            customers={customers}
            revenueAccounts={revenueAccounts}
            inventoryItems={inventoryItems.map((i) => ({
              id: i.id,
              sku: i.sku,
              name: i.name,
              defaultSaleCents: i.defaultSaleCents,
            }))}
            classes={classes}
            taxRates={taxRates.map((t) => ({ id: t.id, name: t.name, ratePercent: t.ratePercent }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
