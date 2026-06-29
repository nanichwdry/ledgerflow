import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { NewInventoryItemForm } from '@/components/new-inventory-item-form';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/utils';

export default async function InventoryPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const items = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Inventory</h1>
        <p className="text-sm text-ink-soft">
          Stock and weighted-average cost — updated automatically by bills and invoices.
        </p>
      </div>

      <NewInventoryItemForm />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">SKU</th>
                <th className="px-5 py-2.5 text-left">Item</th>
                <th className="px-5 py-2.5 text-right">On hand</th>
                <th className="px-5 py-2.5 text-right">Avg. cost</th>
                <th className="px-5 py-2.5 text-right">Sale price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="ledger-rule">
                  <td className="px-5 py-2.5 font-mono text-ink-soft">{item.sku}</td>
                  <td className="px-5 py-2.5 text-ink">
                    {item.name}
                    {item.quantityOnHand <= item.reorderPoint && (
                      <Badge tone="warning" className="ml-2">
                        reorder
                      </Badge>
                    )}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">
                    {item.quantityOnHand}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(item.averageCostCents)}
                  </td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink-soft">
                    {formatCents(item.defaultSaleCents)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                    No items tracked yet.
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
