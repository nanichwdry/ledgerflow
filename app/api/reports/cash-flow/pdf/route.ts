import { NextResponse } from 'next/server';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getCashFlowStatement } from '@/lib/cashflow';
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

  const report = await getCashFlowStatement(org.id, from, to);

  const buffer = await renderStatementPdfBuffer({
    orgName: org.name,
    reportTitle: 'Cash Flow Statement',
    rangeLabel: `${from.toLocaleDateString('en-US')} – ${to.toLocaleDateString('en-US')}`,
    sections: [
      {
        title: 'Operating activities',
        rows: [{ name: 'Net cash from operations', amountCents: report.operatingCents }],
      },
      {
        title: 'Financing activities',
        rows: [{ name: 'Net cash from financing', amountCents: report.financingCents }],
      },
    ],
    summaryLines: [
      { label: 'Beginning cash', amountCents: report.beginningCents },
      { label: 'Ending cash', amountCents: report.endingCents },
    ],
    grandTotal: { label: 'Net change in cash', amountCents: report.netChangeCents },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="cash-flow-statement.pdf"',
    },
  });
}
