/**
 * The curriculum map: levels and the topics inside each level.
 * Every question belongs to exactly one topic.
 */

export interface Level {
  level: number;
  name: string;
  blurb: string;
}

export const LEVELS: Level[] = [
  { level: 0, name: 'Excel fundamentals', blurb: 'References, core functions, lookups, dates, model hygiene.' },
  { level: 1, name: 'Real estate math', blurb: 'NOI, cap rates, leverage metrics, loan payments, loan sizing.' },
  { level: 2, name: 'Acquisition pro forma', blurb: 'Multi-year cash flows, exit value, IRR and equity multiple.' },
  { level: 3, name: 'Development pro forma', blurb: 'Budgets, draws, construction interest, yield on cost.' },
  { level: 4, name: 'Equity waterfalls', blurb: 'Preferred return, promote tiers, GP/LP splits.' },
  { level: 5, name: 'Sensitivity & presentation', blurb: 'Data tables, scenarios, check cells, summary pages.' },
  { level: 6, name: 'Capstone', blurb: 'Full timed case studies graded like a modeling test.' },
];

export const TOPICS = [
  // L0
  { id: 'l0-refs', level: 0, name: 'References & anchoring', blurb: 'Relative, absolute and mixed references; F4.' },
  { id: 'l0-core', level: 0, name: 'Core functions', blurb: 'SUM, ROUND, IF, AND/OR, MIN/MAX, IFERROR.' },
  { id: 'l0-agg', level: 0, name: 'SUMIFS & SUMPRODUCT', blurb: 'Conditional totals and weighted averages.' },
  { id: 'l0-lookup', level: 0, name: 'Lookups', blurb: 'XLOOKUP and INDEX/MATCH.' },
  { id: 'l0-dates', level: 0, name: 'Dates & timelines', blurb: 'EDATE, EOMONTH and monthly timelines.' },
  { id: 'l0-hygiene', level: 0, name: 'Model hygiene', blurb: 'Colour conventions, no hardcodes, named ranges.' },
  // L1
  { id: 'l1-noi', level: 1, name: 'NOI & valuation', blurb: 'NOI, cap rate, value, GRM.' },
  { id: 'l1-leverage', level: 1, name: 'Leverage metrics', blurb: 'LTV, LTC, DSCR, debt yield, cash-on-cash.' },
  { id: 'l1-loan', level: 1, name: 'Loan math', blurb: 'PMT, IPMT, PPMT and amortization schedules.' },
  { id: 'l1-sizing', level: 1, name: 'Loan sizing', blurb: 'Lesser of LTV, DSCR and debt-yield constraints.' },
  // L2
  { id: 'l2-opcf', level: 2, name: 'Operating cash flow', blurb: 'Rent and expense growth, vacancy, reserves.' },
  { id: 'l2-exit', level: 2, name: 'Exit value', blurb: 'Forward NOI, exit cap, sale costs.' },
  { id: 'l2-levered', level: 2, name: 'Levered vs. unlevered', blurb: 'Cash flow before and after debt.' },
  { id: 'l2-returns', level: 2, name: 'Return metrics', blurb: 'IRR, XIRR, NPV, equity multiple.' },
  // L3
  { id: 'l3-budget', level: 3, name: 'Budget & sources/uses', blurb: 'Land, hard, soft, contingency, financing.' },
  { id: 'l3-draws', level: 3, name: 'Draws & construction interest', blurb: 'Equity first, then loan; circularity.' },
  { id: 'l3-leaseup', level: 3, name: 'Lease-up & stabilization', blurb: 'Absorption and stabilized NOI.' },
  { id: 'l3-returns', level: 3, name: 'Development returns', blurb: 'Yield on cost, spread, residual land value.' },
  { id: 'l3-product', level: 3, name: 'Rental vs. for-sale', blurb: 'Build-to-rent compared with condo sell-out.' },
  // L4
  { id: 'l4-pref', level: 4, name: 'Pref & return of capital', blurb: 'Preferred return accrual and payback.' },
  { id: 'l4-promote', level: 4, name: 'Promote tiers', blurb: 'IRR hurdles and GP/LP splits.' },
  // L5
  { id: 'l5-tables', level: 5, name: 'Sensitivity tables', blurb: 'One- and two-way data tables.' },
  { id: 'l5-present', level: 5, name: 'Scenarios & checks', blurb: 'Scenario toggles, check cells, summary page.' },
  // Capstone
  { id: 'cap-cases', level: 6, name: 'Case studies', blurb: 'Full timed model builds.' },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];
export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];

export function topicById(id: string) {
  return TOPICS.find((t) => t.id === id);
}

export function topicName(id: string): string {
  return topicById(id)?.name ?? id;
}
