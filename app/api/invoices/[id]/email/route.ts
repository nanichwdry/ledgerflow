import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { emailInvoice } from '@/lib/invoices';
import { isEmailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  to: z.string().email(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email isn\'t set up yet — add RESEND_API_KEY and RESEND_FROM_EMAIL to your .env.' },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  try {
    const updated = await emailInvoice(invoice.id, parsed.data);
    return NextResponse.json({ invoice: updated });
  } catch (err: any) {
    console.error(`Failed to email invoice ${invoice.id}`, err);
    return NextResponse.json({ error: err.message ?? 'Could not send that email.' }, { status: 400 });
  }
}
