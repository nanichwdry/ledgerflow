// Run with `npm run db:seed`. Normally accounts seed automatically the first
// time someone signs in (see lib/supabase/server.ts) — this script exists to
// backfill any organization created before that logic existed, or to set up
// a local demo org without going through Supabase auth.
import { prisma } from '../lib/prisma';
import { seedDefaultChartOfAccounts } from '../lib/seed-accounts';

async function main() {
  const orgs = await prisma.organization.findMany();

  if (orgs.length === 0) {
    console.log('No organizations exist yet — sign in once via the app to create one.');
    return;
  }

  for (const org of orgs) {
    await seedDefaultChartOfAccounts(org.id);
    console.log(`Seeded default chart of accounts for "${org.name}" (${org.id})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
