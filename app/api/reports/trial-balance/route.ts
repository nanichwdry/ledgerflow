import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getTrialBalance } from '@/lib/ledger';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();

  const rows = await getTrialBalance(org.id, asOf);
  return NextResponse.json({ asOf, rows });
}
