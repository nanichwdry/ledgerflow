import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { createReceiptFromUpload } from '@/lib/receipts';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone photo, cheap to enforce

export async function GET() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const receipts = await prisma.receipt.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ receipts });
}

export async function POST(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type as any)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are supported' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `That image is too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB).` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const receipt = await createReceiptFromUpload(org.id, buffer, file.type as any);
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err: any) {
    console.error('Receipt upload failed', err);
    return NextResponse.json(
      { error: 'Could not upload that receipt. Check your Supabase Storage setup and try again.' },
      { status: 500 }
    );
  }
}
