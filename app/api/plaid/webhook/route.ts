import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncPlaidItemTransactions } from '@/lib/plaid';
import { verifyPlaidWebhook } from '@/lib/plaid-webhook';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const verified = await verifyPlaidWebhook(rawBody, req.headers.get('plaid-verification'));
  if (!verified) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { webhook_type, webhook_code, item_id } = payload;

  if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    const item = await prisma.plaidItem.findUnique({ where: { plaidItemId: item_id } });
    if (item) {
      await syncPlaidItemTransactions(item.id).catch((err) =>
        console.error(`Sync failed for item ${item_id}`, err)
      );
    }
  }

  if (webhook_type === 'ITEM' && webhook_code === 'ERROR') {
    await prisma.plaidItem.updateMany({
      where: { plaidItemId: item_id },
      data: { status: 'ERROR' },
    });
  }

  if (webhook_type === 'ITEM' && webhook_code === 'PENDING_EXPIRATION') {
    await prisma.plaidItem.updateMany({
      where: { plaidItemId: item_id },
      data: { status: 'REAUTH_REQUIRED' },
    });
  }

  // Plaid expects a fast 200 — heavier work above is best-effort and logged on failure.
  return NextResponse.json({ received: true });
}
