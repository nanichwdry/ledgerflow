export type RuleMatchTypeLiteral = 'MERCHANT_CONTAINS' | 'NAME_CONTAINS' | 'PLAID_CATEGORY';

export type SimpleRule = {
  matchType: RuleMatchTypeLiteral;
  matchValue: string;
};

export type MatchableTransaction = {
  name: string;
  merchantName?: string | null;
  personalFinanceCategory?: string | null;
};

/** Pure predicate, no I/O — given one rule, does it match this transaction? */
export function ruleMatches(rule: SimpleRule, txn: MatchableTransaction): boolean {
  const needle = rule.matchValue.toLowerCase();
  switch (rule.matchType) {
    case 'MERCHANT_CONTAINS':
      return Boolean(txn.merchantName?.toLowerCase().includes(needle));
    case 'NAME_CONTAINS':
      return txn.name.toLowerCase().includes(needle);
    case 'PLAID_CATEGORY':
      return txn.personalFinanceCategory?.toLowerCase() === needle;
    default:
      return false;
  }
}
