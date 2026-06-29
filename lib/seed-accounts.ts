import { prisma } from './prisma';
import { AccountType, NormalBalance, RuleMatchType } from '@prisma/client';

const NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  ASSET: NormalBalance.DEBIT,
  EXPENSE: NormalBalance.DEBIT,
  LIABILITY: NormalBalance.CREDIT,
  EQUITY: NormalBalance.CREDIT,
  REVENUE: NormalBalance.CREDIT,
};

// A lean but real small-business chart of accounts. Bank/card accounts created
// by Plaid Link get their own 1xxx/2xxx codes appended after these.
const DEFAULT_ACCOUNTS: { code: string; name: string; type: AccountType; isCashAccount?: boolean }[] = [
  { code: '1100', name: 'Undeposited Funds', type: 'ASSET', isCashAccount: true },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1400', name: 'Inventory', type: 'ASSET' },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2200', name: 'Sales Tax Payable', type: 'LIABILITY' },
  { code: '2300', name: 'Payroll Liabilities', type: 'LIABILITY' },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY' },
  { code: '3900', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  { code: '4100', name: 'Shipping Income', type: 'REVENUE' },
  { code: '4999', name: 'Uncategorized Income', type: 'REVENUE' },
  { code: '6010', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  { code: '6100', name: 'Shipping & Freight', type: 'EXPENSE' },
  { code: '6200', name: 'Office Supplies', type: 'EXPENSE' },
  { code: '6300', name: 'Software & Subscriptions', type: 'EXPENSE' },
  { code: '6400', name: 'Travel', type: 'EXPENSE' },
  { code: '6500', name: 'Meals & Entertainment', type: 'EXPENSE' },
  { code: '6600', name: 'Advertising & Marketing', type: 'EXPENSE' },
  { code: '6700', name: 'Bank Fees & Interest', type: 'EXPENSE' },
  { code: '6800', name: 'Payroll Expense', type: 'EXPENSE' },
  { code: '6810', name: 'Payroll Tax Expense', type: 'EXPENSE' },
  { code: '6900', name: 'Merchant Processing Fees', type: 'EXPENSE' },
  { code: '6999', name: 'Uncategorized Expense', type: 'EXPENSE' },
];

// Maps Plaid's `personal_finance_category.detailed` values to the accounts above.
const DEFAULT_RULES: { plaidCategory: string; accountCode: string }[] = [
  { plaidCategory: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', accountCode: '6400' },
  { plaidCategory: 'TRAVEL_FLIGHTS', accountCode: '6400' },
  { plaidCategory: 'TRAVEL_LODGING', accountCode: '6400' },
  { plaidCategory: 'FOOD_AND_DRINK_RESTAURANTS', accountCode: '6500' },
  { plaidCategory: 'FOOD_AND_DRINK_COFFEE', accountCode: '6500' },
  { plaidCategory: 'GENERAL_MERCHANDISE_OFFICE_SUPPLIES', accountCode: '6200' },
  { plaidCategory: 'GENERAL_SERVICES_ADVERTISING_AND_MARKETING', accountCode: '6600' },
  { plaidCategory: 'GENERAL_SERVICES_SHIPPING', accountCode: '6100' },
  { plaidCategory: 'BANK_FEES_ATM_FEES', accountCode: '6700' },
  { plaidCategory: 'BANK_FEES_FOREIGN_TRANSACTION_FEES', accountCode: '6700' },
  { plaidCategory: 'BANK_FEES_INTEREST_CHARGE', accountCode: '6700' },
  { plaidCategory: 'INCOME_WAGES', accountCode: '4999' },
];

const SOFTWARE_KEYWORDS = ['AWS', 'GOOGLE CLOUD', 'GITHUB', 'VERCEL', 'OPENAI', 'ANTHROPIC', 'ADOBE'];

/** Idempotent — safe to call every time a new organization is created. */
export async function seedDefaultChartOfAccounts(organizationId: string) {
  const created = new Map<string, string>(); // code -> account id

  for (const def of DEFAULT_ACCOUNTS) {
    const account = await prisma.account.upsert({
      where: { organizationId_code: { organizationId, code: def.code } },
      update: {},
      create: {
        organizationId,
        code: def.code,
        name: def.name,
        type: def.type,
        normalBalance: NORMAL_BALANCE[def.type],
        isCashAccount: def.isCashAccount ?? false,
      },
    });
    created.set(def.code, account.id);
  }

  for (const rule of DEFAULT_RULES) {
    const accountId = created.get(rule.accountCode);
    if (!accountId) continue;
    const exists = await prisma.categorizationRule.findFirst({
      where: { organizationId, matchType: 'PLAID_CATEGORY', matchValue: rule.plaidCategory },
    });
    if (!exists) {
      await prisma.categorizationRule.create({
        data: {
          organizationId,
          matchType: RuleMatchType.PLAID_CATEGORY,
          matchValue: rule.plaidCategory,
          accountId,
          priority: 100,
        },
      });
    }
  }

  const softwareAccountId = created.get('6300');
  if (softwareAccountId) {
    for (const keyword of SOFTWARE_KEYWORDS) {
      const exists = await prisma.categorizationRule.findFirst({
        where: { organizationId, matchType: 'NAME_CONTAINS', matchValue: keyword },
      });
      if (!exists) {
        await prisma.categorizationRule.create({
          data: {
            organizationId,
            matchType: RuleMatchType.NAME_CONTAINS,
            matchValue: keyword,
            accountId: softwareAccountId,
            priority: 50, // keyword matches win over broad Plaid-category matches
          },
        });
      }
    }
  }
}
