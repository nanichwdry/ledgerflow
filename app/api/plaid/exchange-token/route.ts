import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { exchangePublicToken, syncPlaidItemTransactions } from '@/lib/plaid';

const schema = z.object({ publicToken: z.string().min(1) });

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const item = await exchangePublicToken(org.id, parsed.data.publicToken);
    const result = await syncPlaidItemTransactions(item.id);
    return NextResponse.json({ itemId: item.id, ...result });
  } catch (err) {
    console.error('exchangePublicToken failed', err);
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
  }
}
