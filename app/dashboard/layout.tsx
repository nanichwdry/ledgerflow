import { redirect } from 'next/navigation';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const org = await getOrCreateOrganization();
  if (!org) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
