import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function BudgetsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const budgets = await prisma.budget.findMany({
    where: { organizationId: org.id },
    orderBy: { year: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Budgets</h1>
          <p className="text-sm text-ink-soft">Set monthly targets per account, compare against actuals.</p>
        </div>
        <Link href="/dashboard/budgets/new">
          <Button>+ New budget</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id} className="ledger-rule">
                  <td className="px-5 py-2.5">
                    <Link href={`/dashboard/budgets/${b.id}`} className="text-ink hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-soft">{b.year}</td>
                </tr>
              ))}
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-ink-soft">
                    No budgets yet.
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
