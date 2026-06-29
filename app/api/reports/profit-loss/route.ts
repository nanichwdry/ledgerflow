import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getProfitAndLoss } from '@/lib/ledger';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from')!)
    : new Date(new Date().getFullYear(), 0, 1);
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  const report = await getProfitAndLoss(org.id, from, to);
  return NextResponse.json(report);
}
