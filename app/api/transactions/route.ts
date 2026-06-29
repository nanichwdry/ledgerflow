import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);

  const transactions = await prisma.plaidTransaction.findMany({
    where: { plaidAccount: { plaidItem: { organizationId: org.id } } },
    include: {
      plaidAccount: { include: { linkedAccount: true } },
      categorizedAccount: true,
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return NextResponse.json({ transactions });
}
