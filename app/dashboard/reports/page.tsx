import Link from 'next/link';
import { Suspense } from 'react';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { getProfitAndLoss, getBalanceSheet } from '@/lib/ledger';
import { getCashFlowStatement } from '@/lib/cashflow';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/date-range-picker';
import { EmailReportForm } from '@/components/email-report-form';
import { isEmailConfigured } from '@/lib/email';
import { cn, formatCents } from '@/lib/utils';

const TABS = [
  { key: 'profit-loss', label: 'Profit & Loss', pdf: 'profit-loss' },
  { key: 'balance-sheet', label: 'Balance Sheet', pdf: 'balance-sheet' },
  { key: 'cash-flow', label: 'Cash Flow', pdf: 'cash-flow' },
] as const;

function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { view?: string; from?: string; to?: string };
}) {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const view = TABS.some((t) => t.key === searchParams.view) ? searchParams.view! : 'profit-loss';
  const from = searchParams.from ?? startOfYear();
  const to = searchParams.to ?? today();
  const pdfQuery = view === 'balance-sheet' ? `asOf=${to}` : `from=${from}&to=${to}`;
  const pdfHref = `/api/reports/${TABS.find((t) => t.key === view)!.pdf}/pdf?${pdfQuery}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl italic text-ink">Reports</h1>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <DateRangePicker defaultFrom={from} defaultTo={to} />
          </Suspense>
          <a href={pdfHref}>
            <Button variant="secondary">Export PDF</Button>
          </a>
          {isEmailConfigured() && (
            <EmailReportForm
              reportType={view as 'profit-loss' | 'balance-sheet' | 'cash-flow'}
              from={from}
              toDate={to}
            />
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-rule">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/reports?view=${tab.key}&from=${from}&to=${to}`}
            className={cn(
              'border-b-2 px-4 py-2 text-sm',
              view === tab.key
                ? 'border-brass text-ink'
                : 'border-transparent text-ink-soft hover:text-ink'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {view === 'profit-loss' && (
        <ProfitAndLoss organizationId={org.id} from={new Date(from)} to={new Date(to)} />
      )}
      {view === 'balance-sheet' && <BalanceSheet organizationId={org.id} asOf={new Date(to)} />}
      {view === 'cash-flow' && (
        <CashFlow organizationId={org.id} from={new Date(from)} to={new Date(to)} />
      )}
    </div>
  );
}

async function ProfitAndLoss({
  organizationId,
  from,
  to,
}: {
  organizationId: string;
  from: Date;
  to: Date;
}) {
  const report = await getProfitAndLoss(organizationId, from, to);

  return (
    <Card>
      <CardBody className="p-0">
        <Section title="Revenue" rows={report.revenue} />
        <Section title="Expenses" rows={report.expenses} />
        <div className="flex items-center justify-between border-t border-rule-strong px-5 py-3">
          <span className="font-display italic text-ink">Net income</span>
          <span
            className={cn(
              'tabular font-mono text-lg',
              report.netIncomeCents >= 0 ? 'text-credit' : 'text-debit'
            )}
          >
            {formatCents(report.netIncomeCents)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

async function BalanceSheet({ organizationId, asOf }: { organizationId: string; asOf: Date }) {
  const report = await getBalanceSheet(organizationId, asOf);

  return (
    <Card>
      <CardBody className="space-y-0 p-0">
        <Section title="Assets" rows={report.assets} />
        <Section title="Liabilities" rows={report.liabilities} />
        <Section
          title="Equity"
          rows={[
            ...report.equity,
            {
              id: 'retained-earnings',
              code: '',
              name: 'Retained earnings (current)',
              balanceCents: report.retainedEarningsCents,
            },
          ]}
        />
        <div className="flex items-center justify-between border-t border-rule-strong px-5 py-3">
          <span className="font-display italic text-ink">
            Assets {report.balances ? '=' : '≠'} Liabilities + Equity
          </span>
          <Badge tone={report.balances ? 'credit' : 'debit'}>
            {report.balances ? 'Balanced' : 'Out of balance'}
          </Badge>
        </div>
      </CardBody>
    </Card>
  );
}

async function CashFlow({
  organizationId,
  from,
  to,
}: {
  organizationId: string;
  from: Date;
  to: Date;
}) {
  const report = await getCashFlowStatement(organizationId, from, to);

  const Row = ({ label, cents, emphasis = false }: { label: string; cents: number; emphasis?: boolean }) => (
    <div className="flex items-center justify-between px-5 py-2.5 ledger-rule">
      <span className={emphasis ? 'font-display italic text-ink' : 'text-ink-soft'}>{label}</span>
      <span className={cn('tabular font-mono', emphasis ? 'text-lg text-ink' : 'text-ink')}>
        {formatCents(cents)}
      </span>
    </div>
  );

  return (
    <Card>
      <CardBody className="space-y-0 p-0">
        <p className="px-5 pt-4 text-xs uppercase tracking-wider text-ink-soft">Operating activities</p>
        <Row label="Net cash from operations" cents={report.operatingCents} />
        <p className="px-5 pt-4 text-xs uppercase tracking-wider text-ink-soft">Financing activities</p>
        <Row label="Net cash from financing" cents={report.financingCents} />
        <p className="px-5 pt-4 text-xs uppercase tracking-wider text-ink-soft">Cash position</p>
        <Row label="Beginning cash" cents={report.beginningCents} />
        <Row label="Ending cash" cents={report.endingCents} />
        <div className="flex items-center justify-between border-t border-rule-strong px-5 py-3">
          <span className="font-display italic text-ink">Net change in cash</span>
          <span
            className={cn(
              'tabular font-mono text-lg',
              report.netChangeCents >= 0 ? 'text-credit' : 'text-debit'
            )}
          >
            {formatCents(report.netChangeCents)}
          </span>
        </div>
        <p className="px-5 py-3 text-xs text-ink-soft">
          Simplified direct-method statement — operating activity is everything except entries that
          also touch an Equity account (owner contributions/draws, loan proceeds), which count as
          financing.
        </p>
      </CardBody>
    </Card>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; code: string; name: string; amountCents?: number; balanceCents?: number }[];
}) {
  const total = rows.reduce((s, r) => s + (r.amountCents ?? r.balanceCents ?? 0), 0);
  return (
    <div className="border-b border-rule py-3">
      <p className="px-5 text-xs uppercase tracking-wider text-ink-soft">{title}</p>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="ledger-rule">
              <td className="w-16 px-5 py-2 font-mono text-ink-soft">{row.code}</td>
              <td className="py-2 text-ink">{row.name}</td>
              <td className="tabular px-5 py-2 text-right font-mono text-ink">
                {formatCents(row.amountCents ?? row.balanceCents ?? 0)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="px-5 py-2 text-right text-xs text-ink-soft">
              Total {title.toLowerCase()}
            </td>
            <td className="tabular px-5 py-2 text-right font-mono text-sm text-ink">
              {formatCents(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
