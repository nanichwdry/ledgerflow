import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { createLinkToken } from '@/lib/plaid';

export async function POST() {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const linkToken = await createLinkToken(org.id);
    return NextResponse.json({ linkToken });
  } catch (err) {
    console.error('createLinkToken failed', err);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
