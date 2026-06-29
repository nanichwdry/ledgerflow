import { describe, it, expect } from 'vitest';
import { computeWeightedAverageCost, computeCogs } from '@/lib/inventory';

describe('computeWeightedAverageCost', () => {
  it('a first purchase sets the average cost to the purchase cost', () => {
    const result = computeWeightedAverageCost(0, 0, 10, 500);
    expect(result.newQuantity).toBe(10);
    expect(result.newAverageCostCents).toBe(500);
  });

  it('blends a second purchase at a different price into a weighted average', () => {
    // 10 units @ $5.00, then 10 more @ $7.00 → 20 units @ $6.00 average
    const result = computeWeightedAverageCost(10, 500, 10, 700);
    expect(result.newQuantity).toBe(20);
    expect(result.newAverageCostCents).toBe(600);
  });

  it('weights an uneven purchase correctly, not just a plain average', () => {
    // 100 units @ $1.00, then 1 unit @ $100.00 → barely moves the average
    const result = computeWeightedAverageCost(100, 100, 1, 10000);
    expect(result.newQuantity).toBe(101);
    // (100*100 + 1*10000) / 101 = 20000/101 ≈ 198.0...
    expect(result.newAverageCostCents).toBe(Math.round(20000 / 101));
    expect(result.newAverageCostCents).not.toBe(Math.round((100 + 10000) / 2)); // not a naive average
  });

  it('rounds to the nearest cent rather than drifting fractional cents', () => {
    const result = computeWeightedAverageCost(3, 333, 1, 100);
    expect(Number.isInteger(result.newAverageCostCents)).toBe(true);
  });
});

describe('computeCogs', () => {
  it('multiplies quantity sold by the current average cost', () => {
    expect(computeCogs(5, 600)).toBe(3000);
  });

  it('handles a zero-cost item without throwing', () => {
    expect(computeCogs(5, 0)).toBe(0);
  });

  it('rounds fractional results to the nearest cent', () => {
    expect(computeCogs(3, 333)).toBe(Math.round(3 * 333));
  });
});
