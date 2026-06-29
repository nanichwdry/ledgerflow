import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getBalanceSheet } from '@/lib/ledger';
import { renderStatementPdfBuffer } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();

  const report = await getBalanceSheet(org.id, asOf);

  const buffer = await renderStatementPdfBuffer({
    orgName: org.name,
    reportTitle: 'Balance Sheet',
    rangeLabel: `As of ${asOf.toLocaleDateString('en-US')}`,
    sections: [
      {
        title: 'Assets',
        rows: report.assets.map((r) => ({ code: r.code, name: r.name, amountCents: r.balanceCents })),
      },
      {
        title: 'Liabilities',
        rows: report.liabilities.map((r) => ({ code: r.code, name: r.name, amountCents: r.balanceCents })),
      },
      {
        title: 'Equity',
        rows: [
          ...report.equity.map((r) => ({ code: r.code, name: r.name, amountCents: r.balanceCents })),
          { name: 'Retained earnings (current)', amountCents: report.retainedEarningsCents },
        ],
      },
    ],
    grandTotal: {
      label: report.balances ? 'Assets = Liabilities + Equity' : 'Out of balance',
      amountCents: report.totalAssets,
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="balance-sheet.pdf"',
    },
  });
}
