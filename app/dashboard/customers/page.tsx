import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { ContactForm } from '@/components/contact-form';
import { Card, CardBody } from '@/components/ui/card';

export default async function CustomersPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id, archived: false },
    include: { invoices: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl italic text-ink">Customers</h1>
          <p className="text-sm text-ink-soft">Who you bill.</p>
        </div>
      </div>

      <ContactForm kind="customers" />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-5 py-2.5 text-left">Email</th>
                <th className="px-5 py-2.5 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">
                    <Link href={`/dashboard/invoices?customerId=${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">{c.email ?? '—'}</td>
                  <td className="px-5 py-2.5 text-right text-ink-soft">{c.invoices.length}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-ink-soft">
                    No customers yet.
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
