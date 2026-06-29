import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SAMPLE_LINES = [
  { account: '1010 · Checking', debit: '', credit: '1,240.00' },
  { account: '6010 · Cost of Goods Sold', debit: '1,240.00', credit: '' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-5 bg-brass" />
            <span className="block h-[2px] w-5 bg-brass/70" />
            <span className="block h-[2px] w-5 bg-brass/40" />
          </div>
          <span className="font-display text-lg italic tracking-tight text-ink">LedgerFlow</span>
        </div>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-8 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-brass-dark">
            Double-entry, automatically
          </p>
          <h1 className="font-display text-4xl italic leading-tight tracking-tight text-ink md:text-5xl">
            Every transaction lands on both sides of the ledger.
          </h1>
          <p className="mt-5 max-w-md text-ink-soft">
            Connect your bank accounts with Plaid and LedgerFlow posts a balanced journal entry
            for every transaction the moment it clears — no spreadsheets, no manual re-entry,
            and a chart of accounts you fully control.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/login">
              <Button>Start your books</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-sm border border-rule bg-surface shadow-ledger">
          <div className="border-b border-rule px-5 py-3">
            <p className="font-display text-sm italic text-ink-soft">Journal — Jun 14</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2 text-left">Account</th>
                <th className="px-5 py-2 text-right">Debit</th>
                <th className="px-5 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LINES.map((line) => (
                <tr key={line.account} className="ledger-rule">
                  <td className="px-5 py-3 text-ink">{line.account}</td>
                  <td className="tabular px-5 py-3 text-right font-mono text-debit">
                    {line.debit}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-mono text-credit">
                    {line.credit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-ink-soft">
            Spice shipment paid by card — posted automatically from your bank feed.
          </p>
        </div>
      </section>
    </main>
  );
}
