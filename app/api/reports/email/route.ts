import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getProfitAndLoss, getBalanceSheet } from '@/lib/ledger';
import { getCashFlowStatement } from '@/lib/cashflow';
import { renderStatementPdfBuffer } from '@/lib/pdf';
import { sendEmail, isEmailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  to: z.string().email(),
  message: z.string().max(2000).optional(),
  reportType: z.enum(['profit-loss', 'balance-sheet', 'cash-flow']),
  from: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export async function POST(req: Request) {
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

  const from = parsed.data.from ?? new Date(new Date().getFullYear(), 0, 1);
  const to = parsed.data.toDate ?? new Date();

  let buffer: Buffer;
  let title: string;
  let filename: string;

  if (parsed.data.reportType === 'profit-loss') {
    const report = await getProfitAndLoss(org.id, from, to);
    title = 'Profit & Loss';
    filename = 'profit-and-loss.pdf';
    buffer = await renderStatementPdfBuffer({
      orgName: org.name,
      reportTitle: title,
      rangeLabel: `${from.toLocaleDateString('en-US')} – ${to.toLocaleDateString('en-US')}`,
      sections: [
        { title: 'Revenue', rows: report.revenue.map((r) => ({ code: r.code, name: r.name, amountCents: r.amountCents })) },
        { title: 'Expenses', rows: report.expenses.map((r) => ({ code: r.code, name: r.name, amountCents: r.amountCents })) },
      ],
      grandTotal: { label: 'Net income', amountCents: report.netIncomeCents },
    });
  } else if (parsed.data.reportType === 'balance-sheet') {
    const report = await getBalanceSheet(org.id, to);
    title = 'Balance Sheet';
    filename = 'balance-sheet.pdf';
    buffer = await renderStatementPdfBuffer({
      orgName: org.name,
      reportTitle: title,
      rangeLabel: `As of ${to.toLocaleDateString('en-US')}`,
      sections: [
        { title: 'Assets', rows: report.assets.map((r) => ({ code: r.code, name: r.name, amountCents: r.balanceCents })) },
        { title: 'Liabilities', rows: report.liabilities.map((r) => ({ code: r.code, name: r.name, amountCents: r.balanceCents })) },
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
  } else {
    const report = await getCashFlowStatement(org.id, from, to);
    title = 'Cash Flow Statement';
    filename = 'cash-flow-statement.pdf';
    buffer = await renderStatementPdfBuffer({
      orgName: org.name,
      reportTitle: title,
      rangeLabel: `${from.toLocaleDateString('en-US')} – ${to.toLocaleDateString('en-US')}`,
      sections: [
        { title: 'Operating activities', rows: [{ name: 'Net cash from operations', amountCents: report.operatingCents }] },
        { title: 'Financing activities', rows: [{ name: 'Net cash from financing', amountCents: report.financingCents }] },
      ],
      summaryLines: [
        { label: 'Beginning cash', amountCents: report.beginningCents },
        { label: 'Ending cash', amountCents: report.endingCents },
      ],
      grandTotal: { label: 'Net change in cash', amountCents: report.netChangeCents },
    });
  }

  try {
    await sendEmail({
      to: parsed.data.to,
      subject: `${title} — ${org.name}`,
      html: `<div style="font-family: sans-serif; color: #15261F;">${
        parsed.data.message ? `<p>${parsed.data.message}</p>` : ''
      }<p>${title} for ${org.name} is attached.</p></div>`,
      attachment: { filename, content: buffer, contentType: 'application/pdf' },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Failed to email report', err);
    return NextResponse.json({ error: err.message ?? 'Could not send that email.' }, { status: 400 });
  }
}
