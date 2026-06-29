import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { NewClassForm } from '@/components/new-class-form';
import { Card, CardBody } from '@/components/ui/card';

export default async function ClassesPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const classes = await prisma.class.findMany({
    where: { organizationId: org.id, archived: false },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Classes</h1>
        <p className="text-sm text-ink-soft">
          Tag transactions by department or location to break out reports later.
        </p>
      </div>

      <NewClassForm />

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="ledger-rule">
                  <td className="px-5 py-2.5 text-ink">{c.name}</td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-ink-soft">No classes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
