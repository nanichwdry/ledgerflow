export class PayrollImbalanceError extends Error {}

/** The math and validation behind a payroll entry — no I/O, no Prisma. */
export function computePayrollLiability(input: {
  grossWagesCents: number;
  employerTaxesCents?: number;
  netPayCents: number;
}) {
  const employerTaxesCents = input.employerTaxesCents ?? 0;
  const totalCostCents = input.grossWagesCents + employerTaxesCents;
  const liabilityCents = totalCostCents - input.netPayCents;
  if (liabilityCents < 0) {
    throw new PayrollImbalanceError('Net pay cannot exceed gross wages plus employer taxes.');
  }
  return { employerTaxesCents, totalCostCents, liabilityCents };
}
