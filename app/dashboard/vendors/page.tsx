import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { ContactForm } from '@/components/contact-form';
import { Card, CardBody } from '@/components/ui/card';

export default async function VendorsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: org.id, archived: false },
    include: { bills: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Vendors</h1>
        <p className="text-sm text-ink-soft">Who bills you.</p>
      </div>

      <ContactForm kind="vendors" />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Email</th>
                <th className="px-5 py-2.5 text-right">Bills</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">{v.name}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{v.email ?? '—'}</td>
                  <td className="px-5 py-2.5 text-right text-ink-soft">{v.bills.length}</td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-ink-soft">
                    No vendors yet.
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
