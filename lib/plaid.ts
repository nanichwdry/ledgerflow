import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  Products,
} from 'plaid';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { postJournalEntry, deleteJournalEntry } from '@/lib/ledger';
import { findMatchingAccount, ensureFallbackAccounts } from '@/lib/categorize';
import { JournalSource } from '@prisma/client';
import { IS_MOCK_MODE } from '@/lib/env';

const env = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments;

const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export async function createLinkToken(organizationId: string) {
  if (IS_MOCK_MODE) {
    return 'mock_link_token';
  }
  const res = await plaidClient.linkTokenCreate({
    user: { client_user_id: organizationId },
    client_name: 'LedgerFlow',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: process.env.PLAID_WEBHOOK_URL,
  });
  return res.data.link_token;
}

/**
 * Exchanges a Link public_token for a permanent access_token, then creates one
 * GL Account per selected bank account (so each bank feed posts into its own
 * "Checking •••1234" style ledger account) plus the PlaidItem/PlaidAccount
 * rows that track the feed itself.
 */
export async function exchangePublicToken(organizationId: string, publicToken: string) {
  if (IS_MOCK_MODE || publicToken === 'mock_public_token') {
    const itemId = 'mock_item_' + Math.random().toString(36).substring(7);
    const institutionId = 'ins_mock';
    const institutionName = 'Mock Sandbox Bank';
    const access_token = 'mock_access_token_' + Math.random().toString(36).substring(7);

    const mockAccounts = [
      {
        account_id: 'mock_acc_checking',
        name: 'Mock Checking',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
      },
      {
        account_id: 'mock_acc_credit',
        name: 'Mock Credit Card',
        mask: '5678',
        type: 'credit',
        subtype: 'credit card',
      }
    ];

    return prisma.$transaction(async (tx) => {
      const item = await tx.plaidItem.create({
        data: {
          organizationId,
          plaidItemId: itemId,
          accessToken: encrypt(access_token),
          institutionId,
          institutionName,
        },
      });

      const [lastAsset, lastLiability] = await Promise.all([
        tx.account.findFirst({
          where: { organizationId, type: 'ASSET', code: { startsWith: '1' } },
          orderBy: { code: 'desc' },
        }),
        tx.account.findFirst({
          where: { organizationId, type: 'LIABILITY', code: { startsWith: '2' } },
          orderBy: { code: 'desc' },
        }),
      ]);
      let nextAssetCode = Math.max(1010, (lastAsset ? parseInt(lastAsset.code, 10) : 1000) + 10);
      let nextLiabilityCode = Math.max(
        2500,
        (lastLiability ? parseInt(lastLiability.code, 10) : 2490) + 10
      );

      for (const plaidAccount of mockAccounts) {
        const isLiability = plaidAccount.type === 'credit' || plaidAccount.type === 'loan';
        const code = isLiability ? nextLiabilityCode : nextAssetCode;
        const glAccount = await tx.account.create({
          data: {
            organizationId,
            code: String(code),
            name: `${plaidAccount.name}${plaidAccount.mask ? ` ••${plaidAccount.mask}` : ''}`,
            type: isLiability ? 'LIABILITY' : 'ASSET',
            normalBalance: isLiability ? 'CREDIT' : 'DEBIT',
            isBankFeed: true,
            isCashAccount: true,
          },
        });
        if (isLiability) nextLiabilityCode += 10;
        else nextAssetCode += 10;

        await tx.plaidAccount.create({
          data: {
            plaidItemId: item.id,
            plaidAccountId: plaidAccount.account_id,
            name: plaidAccount.name,
            mask: plaidAccount.mask ?? undefined,
            type: plaidAccount.type,
            subtype: plaidAccount.subtype ?? undefined,
            linkedAccountId: glAccount.id,
          },
        });
      }

      return item;
    });
  }

  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchange.data;

  const itemRes = await plaidClient.itemGet({ access_token });
  const institutionId = itemRes.data.item.institution_id ?? undefined;
  let institutionName: string | undefined;
  if (institutionId) {
    const inst = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    institutionName = inst.data.institution.name;
  }

  const accountsRes = await plaidClient.accountsGet({ access_token });

  return prisma.$transaction(async (tx) => {
    const item = await tx.plaidItem.create({
      data: {
        organizationId,
        plaidItemId: item_id,
        accessToken: encrypt(access_token),
        institutionId,
        institutionName,
      },
    });

    // Find the highest existing code in each bucket so new bank accounts don't collide.
    const [lastAsset, lastLiability] = await Promise.all([
      tx.account.findFirst({
        where: { organizationId, type: 'ASSET', code: { startsWith: '1' } },
        orderBy: { code: 'desc' },
      }),
      tx.account.findFirst({
        where: { organizationId, type: 'LIABILITY', code: { startsWith: '2' } },
        orderBy: { code: 'desc' },
      }),
    ]);
    let nextAssetCode = Math.max(1010, (lastAsset ? parseInt(lastAsset.code, 10) : 1000) + 10);
    let nextLiabilityCode = Math.max(
      2500,
      (lastLiability ? parseInt(lastLiability.code, 10) : 2490) + 10
    );

    for (const plaidAccount of accountsRes.data.accounts) {
      const isLiability = plaidAccount.type === 'credit' || plaidAccount.type === 'loan';
      const code = isLiability ? nextLiabilityCode : nextAssetCode;
      const glAccount = await tx.account.create({
        data: {
          organizationId,
          code: String(code),
          name: `${plaidAccount.name}${plaidAccount.mask ? ` ••${plaidAccount.mask}` : ''}`,
          type: isLiability ? 'LIABILITY' : 'ASSET',
          normalBalance: isLiability ? 'CREDIT' : 'DEBIT',
          isBankFeed: true,
          isCashAccount: true,
        },
      });
      if (isLiability) nextLiabilityCode += 10;
      else nextAssetCode += 10;

      await tx.plaidAccount.create({
        data: {
          plaidItemId: item.id,
          plaidAccountId: plaidAccount.account_id,
          name: plaidAccount.name,
          mask: plaidAccount.mask ?? undefined,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype ?? undefined,
          linkedAccountId: glAccount.id,
        },
      });
    }

    return item;
  });
}


/**
 * Pulls new/changed/removed transactions since the last cursor using Plaid's
 * /transactions/sync endpoint, auto-categorizes each new transaction against
 * the org's rules (falling back to "Uncategorized Expense/Income"), and posts
 * a balanced journal entry for it immediately so reports never lag the feed.
 */
export async function syncPlaidItemTransactions(plaidItemId: string) {
  const item = await prisma.plaidItem.findUniqueOrThrow({
    where: { id: plaidItemId },
    include: { accounts: true },
  });

  const isMock =
    IS_MOCK_MODE ||
    item.plaidItemId.startsWith('mock_') ||
    !process.env.PLAID_CLIENT_ID ||
    process.env.PLAID_CLIENT_ID === 'your-plaid-client-id';

  if (isMock) {
    const { uncategorizedExpense, uncategorizedIncome } = await ensureFallbackAccounts(
      item.organizationId
    );

    const transactionPool = [
      { name: 'Starbucks Coffee', merchant: 'Starbucks', amount: 4.85, category: 'Food and Drink' },
      { name: 'Target Stores', merchant: 'Target', amount: 54.20, category: 'Shops' },
      { name: 'Landlord Rent', merchant: 'Apartment Rent', amount: 1200.00, category: 'Rent' },
      { name: 'AWS Cloud Hosting', merchant: 'Amazon Web Services', amount: 79.99, category: 'Software' },
      { name: 'Consulting Revenue', merchant: 'Client Payment', amount: -1500.00, category: 'Transfer' },
      { name: 'Stripe Payout', merchant: 'Stripe', amount: -450.00, category: 'Transfer' },
      { name: 'Office Supplies Inc', merchant: 'Office Supplies', amount: 35.50, category: 'Shops' },
    ];

    const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 transactions
    let added = 0;

    for (let i = 0; i < count; i++) {
      const poolTx = transactionPool[Math.floor(Math.random() * transactionPool.length)];
      const plaidAccount = item.accounts[Math.floor(Math.random() * item.accounts.length)];
      if (!plaidAccount) continue;

      const txId = 'mock_tx_' + Math.random().toString(36).substring(7);
      const amountCents = Math.round(poolTx.amount * 100);

      const alreadyExists = await prisma.plaidTransaction.findUnique({
        where: { plaidTransactionId: txId },
      });
      if (alreadyExists) continue;

      const matched = await findMatchingAccount(item.organizationId, {
        name: poolTx.name,
        merchantName: poolTx.merchant,
        personalFinanceCategory: poolTx.category,
      });
      const categorizedAccount =
        matched ?? (amountCents > 0 ? uncategorizedExpense : uncategorizedIncome);

      const stored = await prisma.plaidTransaction.create({
        data: {
          plaidAccountId: plaidAccount.id,
          plaidTransactionId: txId,
          amountCents,
          isoCurrencyCode: 'USD',
          date: new Date(),
          name: poolTx.name,
          merchantName: poolTx.merchant,
          pending: false,
          personalFinanceCategory: poolTx.category,
          categorizedAccountId: categorizedAccount.id,
        },
      });

      await postJournalEntry({
        organizationId: item.organizationId,
        date: new Date(),
        memo: poolTx.merchant ?? poolTx.name,
        source: JournalSource.PLAID_SYNC,
        plaidTransactionId: stored.id,
        lines:
          amountCents > 0
            ? [
                { accountId: categorizedAccount.id, debitCents: amountCents },
                { accountId: plaidAccount.linkedAccountId, creditCents: amountCents },
              ]
            : [
                { accountId: plaidAccount.linkedAccountId, debitCents: -amountCents },
                { accountId: categorizedAccount.id, creditCents: -amountCents },
              ],
      });

      added++;
    }

    return { added, modified: 0, removed: 0 };
  }

  const accessToken = decrypt(item.accessToken);
  const { uncategorizedExpense, uncategorizedIncome } = await ensureFallbackAccounts(
    item.organizationId
  );

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const res = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    const data = res.data;

    for (const txn of data.added) {
      const plaidAccount = item.accounts.find((a) => a.plaidAccountId === txn.account_id);
      if (!plaidAccount) continue;

      const amountCents = Math.round(txn.amount * 100);
      const matched = await findMatchingAccount(item.organizationId, {
        name: txn.name,
        merchantName: txn.merchant_name,
        personalFinanceCategory: txn.personal_finance_category?.detailed,
      });
      const categorizedAccount =
        matched ?? (amountCents > 0 ? uncategorizedExpense : uncategorizedIncome);

      // A duplicate webhook delivery or an overlapping "Sync now" click can
      // hand us the same transaction_id twice before the cursor advances —
      // skip it rather than crash the whole sync on the unique constraint.
      const alreadyExists = await prisma.plaidTransaction.findUnique({
        where: { plaidTransactionId: txn.transaction_id },
      });
      if (alreadyExists) continue;

      let stored;
      try {
        stored = await prisma.plaidTransaction.create({
          data: {
            plaidAccountId: plaidAccount.id,
            plaidTransactionId: txn.transaction_id,
            amountCents,
            isoCurrencyCode: txn.iso_currency_code ?? 'USD',
            date: new Date(txn.date),
            name: txn.name,
            merchantName: txn.merchant_name ?? undefined,
            pending: txn.pending,
            personalFinanceCategory: txn.personal_finance_category?.detailed,
            categorizedAccountId: categorizedAccount.id,
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') continue; // lost the race to a concurrent sync — safe to skip
        throw err;
      }

      if (!txn.pending) {
        const entry = await postJournalEntry({
          organizationId: item.organizationId,
          date: new Date(txn.date),
          memo: txn.merchant_name ?? txn.name,
          source: JournalSource.PLAID_SYNC,
          plaidTransactionId: stored.id,
          lines:
            amountCents > 0
              ? [
                  { accountId: categorizedAccount.id, debitCents: amountCents },
                  { accountId: plaidAccount.linkedAccountId, creditCents: amountCents },
                ]
              : [
                  { accountId: plaidAccount.linkedAccountId, debitCents: -amountCents },
                  { accountId: categorizedAccount.id, creditCents: -amountCents },
                ],
        });
        void entry;
      }
      added++;
    }

    for (const txn of data.modified) {
      await prisma.plaidTransaction
        .update({
          where: { plaidTransactionId: txn.transaction_id },
          data: {
            amountCents: Math.round(txn.amount * 100),
            name: txn.name,
            merchantName: txn.merchant_name ?? undefined,
            pending: txn.pending,
          },
        })
        .catch(() => null); // transaction may not have synced yet
      modified++;
    }

    for (const txn of data.removed) {
      const existing = await prisma.plaidTransaction.findUnique({
        where: { plaidTransactionId: txn.transaction_id! },
      });
      if (existing) {
        if (existing.journalEntryId) await deleteJournalEntry(existing.journalEntryId);
        await prisma.plaidTransaction.delete({ where: { id: existing.id } });
      }
      removed++;
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await prisma.plaidItem.update({ where: { id: item.id }, data: { cursor } });
  return { added, modified, removed };
}

