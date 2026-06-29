import { prisma } from '@/lib/prisma';
import { postJournalEntryInTx, type LedgerLineInput } from '@/lib/ledger';
import { getSystemAccount, SYSTEM_ACCOUNT_CODES } from '@/lib/system-accounts';
import { applyInventorySale } from '@/lib/inventory';
import { assertCustomerInOrg, assertAccountsInOrg, assertInventoryItemsInOrg } from '@/lib/ownership';
import { JournalSource } from '@prisma/client';
import { createPaymentLinkForInvoice } from '@/lib/stripe';
import { renderInvoicePdfBuffer } from '@/lib/pdf';
import { sendEmail } from '@/lib/email';
import { formatCents } from '@/lib/utils';

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  revenueAccountId: string;
  inventoryItemId?: string;
  classId?: string;
};

export async function nextInvoiceNumber(organizationId: string) {
  const last = await prisma.invoice.findFirst({
    where: { organizationId },
    orderBy: { number: 'desc' },
  });
  return (last?.number ?? 1000) + 1;
}

export async function createInvoice(input: {
  organizationId: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  taxCents?: number;
  taxRateId?: string;
  lines: InvoiceLineInput[];
}) {
  const subtotalCents = input.lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitPriceCents),
    0
  );
  const taxCents = input.taxCents ?? 0;

  // Every foreign key below comes straight from a request body — verify each
  // one actually belongs to this org before it's allowed anywhere near the ledger.
  await assertCustomerInOrg(input.organizationId, input.customerId);
  await assertAccountsInOrg(input.organizationId, input.lines.map((l) => l.revenueAccountId));
  await assertInventoryItemsInOrg(
    input.organizationId,
    input.lines.map((l) => l.inventoryItemId).filter((id): id is string => !!id)
  );

  // Two requests can race on nextInvoiceNumber() and both land the same
  // number; the @@unique constraint catches that, so retry with a fresh
  // number instead of surfacing a raw 500 to the person filling out the form.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const number = await nextInvoiceNumber(input.organizationId);
    try {
      return await prisma.invoice.create({
        data: {
          organizationId: input.organizationId,
          customerId: input.customerId,
          number,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          notes: input.notes,
          subtotalCents,
          taxCents,
          totalCents: subtotalCents + taxCents,
          lines: {
            create: input.lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              amountCents: Math.round(l.quantity * l.unitPriceCents),
              revenueAccountId: l.revenueAccountId,
              inventoryItemId: l.inventoryItemId,
              classId: l.classId,
            })),
          },
        },
        include: { lines: true },
      });
    } catch (err: any) {
      const isNumberCollision = err.code === 'P2002' && err.meta?.target?.includes?.('number');
      if (!isNumberCollision || attempt === MAX_ATTEMPTS) throw err;
    }
  }
  throw new Error('Could not allocate an invoice number — please try again.');
}

/**
 * Moves a DRAFT invoice to SENT: recognizes revenue (accrual), draws down any
 * tracked inventory at its current average cost, and — if Stripe is connected —
 * generates a pay-by-link the customer can use from the public invoice page.
 */
export async function sendInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lines: { include: { inventoryItem: true } }, customer: true },
  });
  if (invoice.status !== 'DRAFT') {
    throw new Error('Only draft invoices can be sent.');
  }

  const arAccount = await getSystemAccount(
    invoice.organizationId,
    SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE
  );
  const taxAccount =
    invoice.taxCents > 0
      ? await getSystemAccount(invoice.organizationId, SYSTEM_ACCOUNT_CODES.SALES_TAX_PAYABLE)
      : null;

  const entry = await prisma.$transaction(async (tx) => {
    const lines: LedgerLineInput[] = [
      {
        accountId: arAccount.id,
        debitCents: invoice.totalCents,
        description: `Invoice #${invoice.number}`,
      },
    ];

    for (const line of invoice.lines) {
      lines.push({
        accountId: line.revenueAccountId,
        creditCents: line.amountCents,
        description: line.description,
        classId: line.classId ?? undefined,
      });

      if (line.inventoryItemId) {
        const { cogsCents, accountId, inventoryAccountId } = await applyInventorySale(
          tx,
          line.inventoryItemId,
          line.quantity
        );
        if (cogsCents > 0) {
          lines.push({ accountId, debitCents: cogsCents, description: `COGS — ${line.description}` });
          lines.push({ accountId: inventoryAccountId, creditCents: cogsCents });
        }
      }
    }

    if (taxAccount && invoice.taxCents > 0) {
      lines.push({ accountId: taxAccount.id, creditCents: invoice.taxCents, description: 'Sales tax' });
    }

    const posted = await postJournalEntryInTx(tx, {
      organizationId: invoice.organizationId,
      date: invoice.issueDate,
      memo: `Invoice #${invoice.number} — ${invoice.customer.name}`,
      source: JournalSource.INVOICE_SEND,
      lines,
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT', sendJournalEntryId: posted.id },
    });

    return posted;
  });

  // Best-effort: a missing/invalid Stripe connection shouldn't block sending the invoice.
  await createPaymentLinkForInvoice(invoice.id).catch((err) =>
    console.error(`Stripe payment link skipped for invoice ${invoice.id}`, err)
  );

  return entry;
}

export async function recordInvoicePayment(
  invoiceId: string,
  input: {
    amountCents: number;
    date: Date;
    depositAccountId: string;
    method?: string;
    stripeEventId?: string;
  }
) {
  // Idempotency guard: Stripe redelivers webhooks on timeout/error, and the
  // same event.id would otherwise post this payment a second time.
  if (input.stripeEventId) {
    const existing = await prisma.invoicePayment.findUnique({
      where: { stripeEventId: input.stripeEventId },
    });
    if (existing) return prisma.journalEntry.findUniqueOrThrow({ where: { id: existing.journalEntryId } });
  }

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const arAccount = await getSystemAccount(
    invoice.organizationId,
    SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE
  );
  await assertAccountsInOrg(invoice.organizationId, [input.depositAccountId]);

  return prisma.$transaction(async (tx) => {
    const entry = await postJournalEntryInTx(tx, {
      organizationId: invoice.organizationId,
      date: input.date,
      memo: `Payment received — Invoice #${invoice.number}`,
      source: JournalSource.INVOICE_PAYMENT,
      lines: [
        { accountId: input.depositAccountId, debitCents: input.amountCents },
        { accountId: arAccount.id, creditCents: input.amountCents },
      ],
    });

    await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: input.amountCents,
        date: input.date,
        method: input.method ?? 'manual',
        stripeEventId: input.stripeEventId,
        depositAccountId: input.depositAccountId,
        journalEntryId: entry.id,
      },
    });

    const amountPaidCents = invoice.amountPaidCents + input.amountCents;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaidCents,
        status: amountPaidCents >= invoice.totalCents ? 'PAID' : 'PARTIALLY_PAID',
      },
    });

    return entry;
  });
}

/**
 * Emails the invoice to the customer (or any address) with the PDF attached,
 * including the public view/pay link and, if Stripe is connected, the pay
 * button. Stamps lastEmailedAt so the UI can show "Last emailed: ...".
 */
export async function emailInvoice(
  invoiceId: string,
  input: { to: string; message?: string }
) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { customer: true, lines: true, organization: true },
  });
  if (invoice.status === 'DRAFT') {
    throw new Error('Send the invoice before emailing it.');
  }

  const buffer = await renderInvoicePdfBuffer(invoice.organization.name, {
    ...invoice,
    customerName: invoice.customer.name,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const publicUrl = `${appUrl}/invoice/${invoice.publicToken}`;
  const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;

  const html = `
    <div style="font-family: sans-serif; color: #15261F; max-width: 480px;">
      ${input.message ? `<p>${escapeHtml(input.message)}</p>` : ''}
      <p>Invoice #${invoice.number} from ${escapeHtml(invoice.organization.name)} — ${formatCents(
    invoice.totalCents
  )}${
    balanceDueCents > 0 && balanceDueCents < invoice.totalCents
      ? ` (${formatCents(balanceDueCents)} due)`
      : ''
  }, due ${invoice.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</p>
      <p>The full invoice is attached as a PDF, or you can view${
        balanceDueCents > 0 ? ' and pay' : ''
      } it online:</p>
      <p><a href="${publicUrl}" style="color: #A8823C;">${publicUrl}</a></p>
    </div>
  `;

  await sendEmail({
    to: input.to,
    subject: `Invoice #${invoice.number} from ${invoice.organization.name}`,
    html,
    attachment: {
      filename: `invoice-${invoice.number}.pdf`,
      content: buffer,
      contentType: 'application/pdf',
    },
  });

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: { lastEmailedAt: new Date() },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
