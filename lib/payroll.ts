import { prisma } from '@/lib/prisma';
import { postJournalEntryInTx, type LedgerLineInput } from '@/lib/ledger';
import { assertAccountsInOrg } from '@/lib/ownership';
import { JournalSource } from '@prisma/client';
import { computePayrollLiability } from '@/lib/pure/payroll-rules';

export { computePayrollLiability };

export type PayrollRunInput = {
  organizationId: string;
  payDate: Date;
  periodStart: Date;
  periodEnd: Date;
  notes?: string;
  grossWagesCents: number;
  employerTaxesCents?: number;
  otherDeductionsCents?: number;
  netPayCents: number;
  paidFromAccountId: string;
  wagesExpenseAccountId: string;
  taxExpenseAccountId?: string;
  /** Required whenever gross + employer taxes exceed net pay (i.e. anything is withheld/owed, not paid out today). */
  liabilitiesAccountId?: string;
};

/**
 * Builds the entry as: Debit gross wages (+ employer taxes), Credit net pay
 * out the door now, Credit the remainder to a liability account — the
 * withholdings and employer-tax portion you'll remit to tax agencies later.
 * This is bookkeeping for a payroll run a real provider already processed
 * (Gusto, Check, etc.) — it does not calculate any tax itself.
 */
export async function postPayrollRun(input: PayrollRunInput) {
  const { employerTaxesCents, liabilityCents } = computePayrollLiability(input);

  if (liabilityCents > 0 && !input.liabilitiesAccountId) {
    throw new Error(
      'Net pay is less than gross wages + employer taxes — pick a liabilities account for the difference (withholdings/taxes owed).'
    );
  }

  const accountIds = [
    input.paidFromAccountId,
    input.wagesExpenseAccountId,
    input.taxExpenseAccountId,
    input.liabilitiesAccountId,
  ].filter((id): id is string => !!id);
  await assertAccountsInOrg(input.organizationId, accountIds);

  return prisma.$transaction(async (tx) => {
    const lines: LedgerLineInput[] = [
      { accountId: input.wagesExpenseAccountId, debitCents: input.grossWagesCents, description: 'Gross wages' },
    ];
    if (employerTaxesCents > 0 && input.taxExpenseAccountId) {
      lines.push({
        accountId: input.taxExpenseAccountId,
        debitCents: employerTaxesCents,
        description: 'Employer payroll taxes',
      });
    }
    lines.push({ accountId: input.paidFromAccountId, creditCents: input.netPayCents, description: 'Net pay' });
    if (liabilityCents > 0 && input.liabilitiesAccountId) {
      lines.push({
        accountId: input.liabilitiesAccountId,
        creditCents: liabilityCents,
        description: 'Withholdings & employer taxes payable',
      });
    }

    const entry = await postJournalEntryInTx(tx, {
      organizationId: input.organizationId,
      date: input.payDate,
      memo: `Payroll — ${input.periodStart.toLocaleDateString('en-US')} to ${input.periodEnd.toLocaleDateString('en-US')}`,
      source: JournalSource.PAYROLL,
      lines,
    });

    const run = await tx.payrollRun.create({
      data: {
        organizationId: input.organizationId,
        payDate: input.payDate,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        notes: input.notes,
        grossWagesCents: input.grossWagesCents,
        employerTaxesCents,
        otherDeductionsCents: input.otherDeductionsCents ?? 0,
        netPayCents: input.netPayCents,
        paidFromAccountId: input.paidFromAccountId,
        wagesExpenseAccountId: input.wagesExpenseAccountId,
        taxExpenseAccountId: input.taxExpenseAccountId,
        liabilitiesAccountId: input.liabilitiesAccountId,
        journalEntryId: entry.id,
      },
    });

    return run;
  });
}
