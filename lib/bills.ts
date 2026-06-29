import { prisma } from '@/lib/prisma';
import { postJournalEntryInTx, type LedgerLineInput } from '@/lib/ledger';
import { getSystemAccount, SYSTEM_ACCOUNT_CODES } from '@/lib/system-accounts';
import { applyInventoryPurchase } from '@/lib/inventory';
import { assertVendorInOrg, assertAccountsInOrg, assertInventoryItemsInOrg } from '@/lib/ownership';
import { JournalSource } from '@prisma/client';

export type BillLineInput = {
  description: string;
  quantity: number;
  unitCostCents: number;
  expenseAccountId: string;
  inventoryItemId?: string;
  classId?: string;
};

export async function createBill(input: {
  organizationId: string;
  vendorId: string;
  billDate: Date;
  dueDate: Date;
  reference?: string;
  notes?: string;
  lines: BillLineInput[];
  /** OCR-sourced bills land as DRAFT for review before they post to the ledger. */
  asDraft?: boolean;
}) {
  const totalCents = input.lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitCostCents),
    0
  );

  // Every foreign key below comes straight from a request body — verify each
  // one actually belongs to this org before it's allowed anywhere near the ledger.
  await assertVendorInOrg(input.organizationId, input.vendorId);
  await assertAccountsInOrg(input.organizationId, input.lines.map((l) => l.expenseAccountId));
  const inventoryItemIds = input.lines.map((l) => l.inventoryItemId).filter((id): id is string => !!id);
  await assertInventoryItemsInOrg(input.organizationId, inventoryItemIds);

  // Inventory lines always debit the item's own inventory account, regardless
  // of whatever expenseAccountId the caller passed for that line.
  const inventoryAccountByItem = new Map<string, string>();
  if (inventoryItemIds.length > 0) {
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds }, organizationId: input.organizationId },
    });
    for (const item of items) inventoryAccountByItem.set(item.id, item.inventoryAccountId);
  }

  const bill = await prisma.bill.create({
    data: {
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      billDate: input.billDate,
      dueDate: input.dueDate,
      reference: input.reference,
      notes: input.notes,
      totalCents,
      status: input.asDraft ? 'DRAFT' : 'OPEN',
      lines: {
        create: input.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitCostCents: l.unitCostCents,
          amountCents: Math.round(l.quantity * l.unitCostCents),
          expenseAccountId: l.inventoryItemId
            ? inventoryAccountByItem.get(l.inventoryItemId) ?? l.expenseAccountId
            : l.expenseAccountId,
          inventoryItemId: l.inventoryItemId,
          classId: l.classId,
        })),
      },
    },
    include: { lines: true },
  });

  if (!input.asDraft) {
    await postBillEntry(bill.id);
  }
  return bill;
}

/** Posts a DRAFT or just-created bill to the ledger: Debit expense/inventory lines, Credit AP. */
export async function postBillEntry(billId: string) {
  const bill = await prisma.bill.findUniqueOrThrow({
    where: { id: billId },
    include: { lines: { include: { inventoryItem: true } }, vendor: true },
  });
  if (bill.entryJournalEntryId) {
    throw new Error('This bill has already been posted.');
  }

  const apAccount = await getSystemAccount(bill.organizationId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE);

  return prisma.$transaction(async (tx) => {
    const lines: LedgerLineInput[] = [];

    for (const line of bill.lines) {
      lines.push({
        accountId: line.expenseAccountId, // for inventory lines this is set to the item's inventory account
        debitCents: line.amountCents,
        description: line.description,
        classId: line.classId ?? undefined,
      });
      if (line.inventoryItemId) {
        await applyInventoryPurchase(tx, line.inventoryItemId, line.quantity, line.unitCostCents);
      }
    }
    lines.push({ accountId: apAccount.id, creditCents: bill.totalCents });

    const entry = await postJournalEntryInTx(tx, {
      organizationId: bill.organizationId,
      date: bill.billDate,
      memo: `Bill${bill.reference ? ` #${bill.reference}` : ''} — ${bill.vendor.name}`,
      source: JournalSource.BILL_ENTRY,
      lines,
    });

    await tx.bill.update({
      where: { id: bill.id },
      data: { status: bill.status === 'DRAFT' ? 'OPEN' : bill.status, entryJournalEntryId: entry.id },
    });

    return entry;
  });
}

export async function payBill(
  billId: string,
  input: { amountCents: number; date: Date; paidFromAccountId: string }
) {
  const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId } });
  const apAccount = await getSystemAccount(bill.organizationId, SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE);
  await assertAccountsInOrg(bill.organizationId, [input.paidFromAccountId]);

  return prisma.$transaction(async (tx) => {
    const entry = await postJournalEntryInTx(tx, {
      organizationId: bill.organizationId,
      date: input.date,
      memo: `Bill payment${bill.reference ? ` — #${bill.reference}` : ''}`,
      source: JournalSource.BILL_PAYMENT,
      lines: [
        { accountId: apAccount.id, debitCents: input.amountCents },
        { accountId: input.paidFromAccountId, creditCents: input.amountCents },
      ],
    });

    await tx.billPayment.create({
      data: {
        billId: bill.id,
        amountCents: input.amountCents,
        date: input.date,
        paidFromAccountId: input.paidFromAccountId,
        journalEntryId: entry.id,
      },
    });

    const amountPaidCents = bill.amountPaidCents + input.amountCents;
    await tx.bill.update({
      where: { id: bill.id },
      data: {
        amountPaidCents,
        status: amountPaidCents >= bill.totalCents ? 'PAID' : 'PARTIALLY_PAID',
      },
    });

    return entry;
  });
}
