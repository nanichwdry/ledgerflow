import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { syncPlaidItemTransactions } from '@/lib/plaid';

const schema = z.object({ itemId: z.string().min(1) });

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const item = await prisma.plaidItem.findFirst({
    where: { id: parsed.data.itemId, organizationId: org.id },
  });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  try {
    const result = await syncPlaidItemTransactions(item.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('sync failed', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
