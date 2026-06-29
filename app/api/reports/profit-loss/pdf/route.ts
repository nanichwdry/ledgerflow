import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getProfitAndLoss } from '@/lib/ledger';
import { renderStatementPdfBuffer } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from')!)
    : new Date(new Date().getFullYear(), 0, 1);
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  const report = await getProfitAndLoss(org.id, from, to);

  const buffer = await renderStatementPdfBuffer({
    orgName: org.name,
    reportTitle: 'Profit & Loss',
    rangeLabel: `${from.toLocaleDateString('en-US')} – ${to.toLocaleDateString('en-US')}`,
    sections: [
      {
        title: 'Revenue',
        rows: report.revenue.map((r) => ({ code: r.code, name: r.name, amountCents: r.amountCents })),
      },
      {
        title: 'Expenses',
        rows: report.expenses.map((r) => ({ code: r.code, name: r.name, amountCents: r.amountCents })),
      },
    ],
    grandTotal: { label: 'Net income', amountCents: report.netIncomeCents },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="profit-and-loss.pdf"',
    },
  });
}
