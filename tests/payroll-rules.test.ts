import { describe, it, expect } from 'vitest';
import { computePayrollLiability, PayrollImbalanceError } from '@/lib/pure/payroll-rules';

describe('computePayrollLiability', () => {
  it('computes zero liability when net pay covers the full cost', () => {
    const result = computePayrollLiability({ grossWagesCents: 500000, netPayCents: 500000 });
    expect(result.liabilityCents).toBe(0);
    expect(result.employerTaxesCents).toBe(0);
  });

  it('computes the withholding+tax liability when net pay is less than gross', () => {
    // $5,000 gross, $300 employer tax, $4,000 net → $1,300 owed to tax agencies
    const result = computePayrollLiability({
      grossWagesCents: 500000,
      employerTaxesCents: 30000,
      netPayCents: 400000,
    });
    expect(result.totalCostCents).toBe(530000);
    expect(result.liabilityCents).toBe(130000);
  });

  it('defaults employerTaxesCents to 0 when omitted', () => {
    const result = computePayrollLiability({ grossWagesCents: 100000, netPayCents: 80000 });
    expect(result.employerTaxesCents).toBe(0);
    expect(result.liabilityCents).toBe(20000);
  });

  it('rejects net pay exceeding gross + employer taxes', () => {
    expect(() =>
      computePayrollLiability({ grossWagesCents: 100000, netPayCents: 150000 })
    ).toThrow(PayrollImbalanceError);
  });
});
