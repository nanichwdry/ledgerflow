import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentMembership } from '@/lib/supabase/server';
import { connectStripe, disconnectStripe, getStripeStatus } from '@/lib/stripe';
import { canManageIntegrations } from '@/lib/membership';

const schema = z.object({
  secretKey: z.string().min(10),
  webhookSecret: z.string().min(10),
});

export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const status = await getStripeStatus(membership.organizationId);
  return NextResponse.json({
    ...status,
    webhookUrl: `/api/integrations/stripe/webhook/${membership.organizationId}`,
  });
}

export async function POST(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canManageIntegrations(membership.role)) {
    return NextResponse.json({ error: "Your role can't manage integrations." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await connectStripe(membership.organizationId, parsed.data);
    return NextResponse.json({ connected: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Could not verify that Stripe key. Double-check it and try again.' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!canManageIntegrations(membership.role)) {
    return NextResponse.json({ error: "Your role can't manage integrations." }, { status: 403 });
  }

  await disconnectStripe(membership.organizationId);
  return NextResponse.json({ connected: false });
}
