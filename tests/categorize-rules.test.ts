import { describe, it, expect } from 'vitest';
import { ruleMatches } from '@/lib/pure/categorize-rules';

describe('ruleMatches', () => {
  it('MERCHANT_CONTAINS matches case-insensitively against merchantName', () => {
    expect(
      ruleMatches(
        { matchType: 'MERCHANT_CONTAINS', matchValue: 'starbucks' },
        { name: 'POS PURCHASE', merchantName: 'Starbucks #4521' }
      )
    ).toBe(true);
  });

  it('MERCHANT_CONTAINS does not match when merchantName is missing', () => {
    expect(
      ruleMatches(
        { matchType: 'MERCHANT_CONTAINS', matchValue: 'starbucks' },
        { name: 'POS PURCHASE', merchantName: null }
      )
    ).toBe(false);
  });

  it('NAME_CONTAINS matches against the raw transaction name', () => {
    expect(
      ruleMatches(
        { matchType: 'NAME_CONTAINS', matchValue: 'AWS' },
        { name: 'AMAZON WEB SERVICES AWS123', merchantName: null }
      )
    ).toBe(true);
  });

  it('NAME_CONTAINS is case-insensitive', () => {
    expect(
      ruleMatches({ matchType: 'NAME_CONTAINS', matchValue: 'github' }, { name: 'GITHUB INC.' })
    ).toBe(true);
  });

  it('PLAID_CATEGORY requires an exact (case-insensitive) match, not a substring', () => {
    expect(
      ruleMatches(
        { matchType: 'PLAID_CATEGORY', matchValue: 'FOOD_AND_DRINK_COFFEE' },
        { name: 'x', personalFinanceCategory: 'FOOD_AND_DRINK_COFFEE' }
      )
    ).toBe(true);
    expect(
      ruleMatches(
        { matchType: 'PLAID_CATEGORY', matchValue: 'FOOD_AND_DRINK_COFFEE' },
        { name: 'x', personalFinanceCategory: 'FOOD_AND_DRINK_COFFEE_SHOPS' }
      )
    ).toBe(false);
  });

  it('does not match an unrelated rule', () => {
    expect(
      ruleMatches(
        { matchType: 'NAME_CONTAINS', matchValue: 'AWS' },
        { name: 'WHOLE FOODS MARKET', merchantName: 'Whole Foods' }
      )
    ).toBe(false);
  });
});
