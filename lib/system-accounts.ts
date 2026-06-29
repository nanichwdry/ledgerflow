import { prisma } from '@/lib/prisma';

export const SYSTEM_ACCOUNT_CODES = {
  UNDEPOSITED_FUNDS: '1100',
  ACCOUNTS_RECEIVABLE: '1200',
  INVENTORY: '1400',
  ACCOUNTS_PAYABLE: '2100',
  SALES_TAX_PAYABLE: '2200',
  SALES_REVENUE: '4000',
  COST_OF_GOODS_SOLD: '6010',
  MERCHANT_FEES: '6900',
} as const;

export async function getSystemAccount(
  organizationId: string,
  code: (typeof SYSTEM_ACCOUNT_CODES)[keyof typeof SYSTEM_ACCOUNT_CODES]
) {
  return prisma.account.findUniqueOrThrow({
    where: { organizationId_code: { organizationId, code } },
  });
}
