import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { ensureFallbackAccounts } from '@/lib/categorize';
import { TransactionRow } from '@/components/transaction-row';
import { Card, CardBody } from '@/components/ui/card';

export default async function TransactionsPage() {
  const org = await getOrCreateOrganization();
  if (!org) return null;

  const { uncategorizedExpense, uncategorizedIncome } = await ensureFallbackAccounts(org.id);

  const [transactions, accounts] = await Promise.all([
    prisma.plaidTransaction.findMany({
      where: { plaidAccount: { plaidItem: { organizationId: org.id } } },
      include: { plaidAccount: { include: { linkedAccount: true } }, categorizedAccount: true },
      orderBy: { date: 'desc' },
      take: 200,
    }),
    prisma.account.findMany({
      where: { organizationId: org.id, archived: false },
      orderBy: { code: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl italic text-ink">Transactions</h1>
        <p className="text-sm text-ink-soft">
          Every row already posted a balanced journal entry — recategorize and we&apos;ll repost it.
        </p>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="ledger-rule-strong text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2.5 text-left">Date</th>
                <th className="px-5 py-2.5 text-left">Description</th>
                <th className="px-5 py-2.5 text-left">Account</th>
                <th className="px-5 py-2.5 text-left">Category</th>
                <th className="px-5 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={{
                    id: t.id,
                    date: t.date.toISOString(),
                    name: t.name,
                    merchantName: t.merchantName,
                    amountCents: t.amountCents,
                    pending: t.pending,
                    bankAccountName: t.plaidAccount.linkedAccount.name,
                    categorizedAccountId: t.categorizedAccountId,
                    categorizedAccountCode: t.categorizedAccount?.code ?? null,
                    isUncategorized:
                      t.categorizedAccountId === uncategorizedExpense.id ||
                      t.categorizedAccountId === uncategorizedIncome.id,
                  }}
                  accounts={accounts}
                />
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                    No transactions yet — connect a bank account to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
