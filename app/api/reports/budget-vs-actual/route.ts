import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getBudgetVsActual } from '@/lib/budget';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get('budgetId');
  if (!budgetId) return NextResponse.json({ error: 'budgetId is required' }, { status: 400 });

  const budget = await prisma.budget.findFirst({ where: { id: budgetId, organizationId: org.id } });
  if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 });

  const rows = await getBudgetVsActual(budgetId);
  return NextResponse.json({ budget, rows });
}
