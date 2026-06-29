import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { organizationId: string } }) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  const rawBody = await req.text();

  try {
    const result = await handleStripeWebhook(params.organizationId, rawBody, signature);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`Stripe webhook failed for org ${params.organizationId}`, err);
    return NextResponse.json({ error: err.message ?? 'Webhook error' }, { status: 400 });
  }
}
