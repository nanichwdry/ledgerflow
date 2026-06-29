'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCents, dollarsToCents } from '@/lib/utils';

type Account = { id: string; code: string; name: string };

export function PayrollRunForm({
  cashAccounts,
  expenseAccounts,
  liabilityAccounts,
}: {
  cashAccounts: Account[];
  expenseAccounts: Account[];
  liabilityAccounts: Account[];
}) {
  const router = useRouter();
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [grossWages, setGrossWages] = useState('');
  const [employerTaxes, setEmployerTaxes] = useState('0');
  const [netPay, setNetPay] = useState('');
  const [paidFromAccountId, setPaidFromAccountId] = useState(cashAccounts[0]?.id ?? '');
  const [wagesExpenseAccountId, setWagesExpenseAccountId] = useState(
    expenseAccounts.find((a) => a.name.toLowerCase().includes('payroll'))?.id ?? expenseAccounts[0]?.id ?? ''
  );
  const [taxExpenseAccountId, setTaxExpenseAccountId] = useState(
    expenseAccounts.find((a) => a.name.toLowerCase().includes('payroll tax'))?.id ?? ''
  );
  const [liabilitiesAccountId, setLiabilitiesAccountId] = useState(liabilityAccounts[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liabilityCents = useMemo(() => {
    const gross = dollarsToCents(parseFloat(grossWages) || 0);
    const taxes = dollarsToCents(parseFloat(employerTaxes) || 0);
    const net = dollarsToCents(parseFloat(netPay) || 0);
    return gross + taxes - net;
  }, [grossWages, employerTaxes, netPay]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payDate,
        periodStart,
        periodEnd,
        grossWagesCents: dollarsToCents(parseFloat(grossWages) || 0),
        employerTaxesCents: dollarsToCents(parseFloat(employerTaxes) || 0),
        netPayCents: dollarsToCents(parseFloat(netPay) || 0),
        paidFromAccountId,
        wagesExpenseAccountId,
        taxExpenseAccountId: taxExpenseAccountId || undefined,
        liabilitiesAccountId: liabilityCents > 0 ? liabilitiesAccountId : undefined,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      router.push('/dashboard/payroll');
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not post that payroll run.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Pay date</label>
          <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Period start</label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Period end</label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Gross wages</label>
          <Input type="number" step="0.01" min="0" value={grossWages} onChange={(e) => setGrossWages(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Employer taxes
          </label>
          <Input type="number" step="0.01" min="0" value={employerTaxes} onChange={(e) => setEmployerTaxes(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Net pay (paid today)</label>
          <Input type="number" step="0.01" min="0" value={netPay} onChange={(e) => setNetPay(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Pay from</label>
          <Select value={paidFromAccountId} onChange={(e) => setPaidFromAccountId(e.target.value)} required>
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Wages expense account
          </label>
          <Select value={wagesExpenseAccountId} onChange={(e) => setWagesExpenseAccountId(e.target.value)} required>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Tax expense account
          </label>
          <Select value={taxExpenseAccountId} onChange={(e) => setTaxExpenseAccountId(e.target.value)}>
            <option value="">—</option>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </Select>
        </div>
        {liabilityCents > 0 && (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
              Liabilities account (withholdings owed)
            </label>
            <Select value={liabilitiesAccountId} onChange={(e) => setLiabilitiesAccountId(e.target.value)} required>
              {liabilityAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <span className="tabular font-mono text-sm text-ink-soft">
          {liabilityCents > 0
            ? `${formatCents(liabilityCents)} owed to tax agencies (withholdings + employer tax)`
            : liabilityCents < 0
              ? 'Net pay exceeds gross + employer tax — check your numbers'
              : 'Fully paid out today, nothing owed'}
        </span>
        <Button type="submit" disabled={submitting || liabilityCents < 0}>
          {submitting ? 'Posting…' : 'Post payroll run'}
        </Button>
      </div>
      {error && <p className="text-sm text-debit">{error}</p>}
    </form>
  );
}
