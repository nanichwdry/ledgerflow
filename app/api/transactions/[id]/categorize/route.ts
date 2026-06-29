import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { postJournalEntry, deleteJournalEntry } from '@/lib/ledger';
import { JournalSource } from '@prisma/client';

const schema = z.object({ accountId: z.string().min(1) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const txn = await prisma.plaidTransaction.findFirst({
    where: {
      id: params.id,
      plaidAccount: { plaidItem: { organizationId: org.id } },
    },
    include: { plaidAccount: true, journalEntry: { include: { lines: true } } },
  });
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (txn.journalEntry?.lines.some((l: { reconciliationId: string | null }) => l.reconciliationId)) {
    return NextResponse.json(
      { error: 'This transaction has been reconciled and is locked from recategorizing. Undo the reconciliation first if you need to change it.' },
      { status: 400 }
    );
  }

  const newAccount = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, organizationId: org.id },
  });
  if (!newAccount) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  if (txn.journalEntryId) {
    await deleteJournalEntry(txn.journalEntryId);
  }

  const updated = await prisma.plaidTransaction.update({
    where: { id: txn.id },
    data: { categorizedAccountId: newAccount.id },
  });

  if (!txn.pending) {
    await postJournalEntry({
      organizationId: org.id,
      date: txn.date,
      memo: txn.merchantName ?? txn.name,
      source: JournalSource.PLAID_SYNC,
      plaidTransactionId: txn.id,
      lines:
        txn.amountCents > 0
          ? [
              { accountId: newAccount.id, debitCents: txn.amountCents },
              { accountId: txn.plaidAccount.linkedAccountId, creditCents: txn.amountCents },
            ]
          : [
              { accountId: txn.plaidAccount.linkedAccountId, debitCents: -txn.amountCents },
              { accountId: newAccount.id, creditCents: -txn.amountCents },
            ],
    });
  }

  return NextResponse.json({ transaction: updated });
}
