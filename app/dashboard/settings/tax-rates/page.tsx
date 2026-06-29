import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { NewTaxRateForm } from '@/components/new-tax-rate-form';
import { Card, CardBody } from '@/components/ui/card';

export default async function TaxRatesPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const taxRates = await prisma.taxRate.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Sales tax rates</h1>
        <p className="text-sm text-ink-soft">
          Maintain a named rate per jurisdiction, then pick one on each invoice. This isn&apos;t
          automated address-based lookup (see the README) — you keep these current yourself.
        </p>
      </div>

      <NewTaxRateForm />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Region</th>
                <th className="px-5 py-2.5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {taxRates.map((t) => (
                <tr key={t.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">{t.name}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{t.region ?? '—'}</td>
                  <td className="tabular px-5 py-2.5 text-right font-mono text-ink">{t.ratePercent}%</td>
                </tr>
              ))}
              {taxRates.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-ink-soft">
                    No tax rates yet.
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
