import { prisma } from '@/lib/prisma';

export class CrossTenantReferenceError extends Error {
  constructor(entity: string) {
    super(`That ${entity} doesn't belong to your organization.`);
  }
}

export async function assertAccountInOrg(organizationId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) throw new CrossTenantReferenceError('account');
  return account;
}

export async function assertCustomerInOrg(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
  if (!customer) throw new CrossTenantReferenceError('customer');
  return customer;
}

export async function assertVendorInOrg(organizationId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
  if (!vendor) throw new CrossTenantReferenceError('vendor');
  return vendor;
}

export async function assertInventoryItemsInOrg(organizationId: string, itemIds: string[]) {
  if (itemIds.length === 0) return;
  const found = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds }, organizationId },
    select: { id: true },
  });
  if (found.length !== new Set(itemIds).size) throw new CrossTenantReferenceError('inventory item');
}

/** Verifies every account id in the list belongs to the org, in one query. */
export async function assertAccountsInOrg(organizationId: string, accountIds: string[]) {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return;
  const found = await prisma.account.findMany({
    where: { id: { in: ids }, organizationId },
    select: { id: true },
  });
  if (found.length !== ids.length) throw new CrossTenantReferenceError('account');
}
