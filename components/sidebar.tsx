import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';

const NAV_SECTIONS: { heading: string | null; items: { href: string; label: string }[] }[] = [
  {
    heading: null,
    items: [
      { href: '/dashboard', label: 'Overview' },
      { href: '/dashboard/banks', label: 'Bank feeds' },
      { href: '/dashboard/transactions', label: 'Transactions' },
      { href: '/dashboard/reconcile', label: 'Reconcile' },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { href: '/dashboard/invoices', label: 'Invoices' },
      { href: '/dashboard/customers', label: 'Customers' },
    ],
  },
  {
    heading: 'Purchases',
    items: [
      { href: '/dashboard/bills', label: 'Bills' },
      { href: '/dashboard/receipts', label: 'Receipts' },
      { href: '/dashboard/vendors', label: 'Vendors' },
      { href: '/dashboard/inventory', label: 'Inventory' },
    ],
  },
  {
    heading: 'Accounting',
    items: [
      { href: '/dashboard/journal', label: 'Journal' },
      { href: '/dashboard/accounts', label: 'Chart of accounts' },
      { href: '/dashboard/classes', label: 'Classes' },
      { href: '/dashboard/payroll', label: 'Payroll' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { href: '/dashboard/reports', label: 'Reports' },
      { href: '/dashboard/budgets', label: 'Budgets' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { href: '/dashboard/settings/team', label: 'Team' },
      { href: '/dashboard/settings/tax-rates', label: 'Tax rates' },
      { href: '/dashboard/settings/integrations', label: 'Integrations' },
      { href: '/dashboard/settings/audit-log', label: 'Audit log' },
    ],
  },
];

export function Sidebar({ orgName }: { orgName: string }) {
  return (
    <aside className="flex h-screen w-60 flex-col justify-between bg-panel text-paper">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          {/* signature: a stack of hairline "ledger stitches" standing in for a logo mark */}
          <div className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-5 bg-brass" />
            <span className="block h-[2px] w-5 bg-brass/70" />
            <span className="block h-[2px] w-5 bg-brass/40" />
          </div>
          <span className="font-display text-lg italic tracking-tight">LedgerFlow</span>
        </div>

        <nav
          className="mt-2 flex flex-col gap-0.5 overflow-y-auto px-3 pb-4"
          style={{ maxHeight: 'calc(100vh - 150px)' }}
        >
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className="mb-1">
              {section.heading && (
                <p className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-wider text-paper/35">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-sm px-3 py-2 text-sm text-paper/70 transition-colors hover:bg-panel-soft hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs uppercase tracking-wider text-paper/40">{orgName}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
