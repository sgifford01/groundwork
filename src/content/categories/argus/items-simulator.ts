/** Commercial Leases & ARGUS: lease simulator questions (subtopic argus-simulator). See BUILD_SPEC.md section 13. */
import { categoryItems } from '../define';
import { SORRENTO_OFFICE, withInputs } from './scenario';

const SETTING = 'The simulator shows a four-tenant office building in Sorrento Mesa (illustrative figures).';

export const ITEMS = categoryItems('argus', [
  {
    id: 'argus-simulator-leasesim-recovery-ratio',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'How much of the expenses does the landlord recover?',
    prompt: `${SETTING} The four tenants have four different recovery structures. Using the year 1 column of the cash flow, what share of the building’s operating expenses does the landlord get back from tenants?`,
    tags: ['recoveries', 'cash flow report', 'lease simulator'],
    estMinutes: 3,
    hints: [
      'Two lines of the cash flow are all you need.',
      'Recoveries are what tenants reimburse. Operating expenses are what the building costs to run.',
      'Share recovered = expense recoveries / operating expenses, both from year 1.',
    ],
    scenario: SORRENTO_OFFICE,
    variants: [{}, { 'building.expensesYear1': 560000 }, { 'building.expensesYear1': 600000, 'tenants.suite-300.stopPsf': 13 }, { 'tenants.suite-200.baseYearExpenses': 480000 }],
    task: {
      kind: 'read',
      answer: '=recoveries_year_one/expenses_year_one',
      format: 'pct1',
      tolerance: { abs: 0.003 },
      mistakes: [
        { formula: '=recoveries_year_one/egr_year_one', label: 'That is recoveries as a share of revenue. The question is how much of the EXPENSES come back: divide by operating expenses.', category: 'wrong-base' },
        { formula: '=1-recoveries_year_one/expenses_year_one', label: 'That is the share the landlord does NOT recover. The question asks for the share it does.', category: 'concept' },
        { formula: '=recoveries_year_one/base_rent_year_one', label: 'That compares recoveries with base rent. Divide by operating expenses instead.', category: 'wrong-base' },
      ],
    },
    explanation:
      'Year 1 recoveries are {recoveries_year_one|usd} against operating expenses of {expenses_year_one|usd}: {=recoveries_year_one/expenses_year_one|pct1}. Only the triple-net tenant reimburses its full share. The base-year tenant pays only increases over its base year, the expense-stop tenant pays only the amount above its stop, and the gross tenant pays nothing. The landlord carries the rest, which is why the mix of lease structures matters as much as the rents.',
  },
  {
    id: 'argus-simulator-leasesim-rollover-dip',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'Size the dip in a rollover year',
    prompt: `${SETTING} Suite 300’s lease ends at the end of year 2, so the space rolls in year 3. By how much is cash flow before debt lower in year 3 than in year 2?`,
    tags: ['rollover', 'cash flow before debt', 'TI', 'leasing commissions', 'lease simulator'],
    estMinutes: 3,
    hints: [
      'Use the bottom line of the cash flow, not NOI.',
      'A rollover costs downtime and free rent (inside NOI) and also tenant improvements and commissions (below NOI).',
      'Year 2 cash flow before debt minus year 3 cash flow before debt.',
    ],
    scenario: SORRENTO_OFFICE,
    variants: [{}, { 'mla.renewalProbability': 0.5 }, { 'mla.tiNew': 60, 'mla.downtimeMonths': 6 }, { 'mla.marketRent': 44 }],
    task: {
      kind: 'read',
      answer: '=cash_flow_year_two-cash_flow_year_three',
      format: 'usd',
      mistakes: [
        { formula: '=noi_year_two-noi_year_three', label: 'That is the change in NOI. Tenant improvements and leasing commissions sit BELOW NOI, and they are most of the cost of a rollover.', category: 'omitted' },
        { formula: '=ti_year_three+lc_year_three', label: 'That counts only the leasing costs. The year also loses rent to downtime and free rent, and other lines move too. Compare the two bottom lines.', category: 'omitted' },
        { formula: '=cash_flow_year_three-cash_flow_year_two', label: 'Right size, wrong sign: the question asks how much LOWER year 3 is, so give a positive number.', category: 'sign' },
      ],
    },
    explanation:
      'Cash flow before debt falls from {cash_flow_year_two|usd} to {cash_flow_year_three|usd}, a drop of {=cash_flow_year_two-cash_flow_year_three|usd}. NOI moves by only {=noi_year_two-noi_year_three|usd}; the rest is tenant improvements ({ti_year_three|usd}) and leasing commissions ({lc_year_three|usd}), which are deducted after NOI. A buyer who values the building on NOI alone misses most of what a rollover costs.',
  },
  {
    id: 'argus-simulator-leasesim-abstract-suite',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'Enter a lease from its abstract',
    prompt:
      `${SETTING} Suite 300 was entered carelessly. Its lease abstract reads: "Mesa Title Co., 8,000 SF. Base rent $34.00 per SF in the first lease year, increasing 2.5% a year. The lease expires at the end of analysis year 2. Tenant reimburses operating expenses above an expense stop of $12.00 per SF." Correct the Suite 300 row so the cash flow reflects the lease.`,
    tags: ['lease abstract', 'rent roll', 'expense stop', 'lease simulator'],
    estMinutes: 5,
    hints: [
      'Go through the abstract one fact at a time and compare each with the row.',
      'Four inputs are wrong: the rent, the escalation, the expiry year and the stop.',
      'Rent 34.00, escalation 2.5, lease ends in year 2, stop 12.00.',
    ],
    scenario: withInputs({ tenants: { 'suite-300': { baseRent: 36, escalation: 0.03, endYear: 3, stopPsf: 13 } } }),
    editable: ['tenants.suite-300.sf', 'tenants.suite-300.startYear', 'tenants.suite-300.endYear', 'tenants.suite-300.baseRent', 'tenants.suite-300.escalation', 'tenants.suite-300.stopPsf'],
    task: {
      kind: 'configure',
      target: { 'tenants.suite-300.baseRent': 34, 'tenants.suite-300.escalation': 0.025, 'tenants.suite-300.endYear': 2, 'tenants.suite-300.stopPsf': 12 },
      checks: [
        { fact: 'base_rent_year_one', label: 'Base rent, year 1' },
        { fact: 'recoveries_year_one', label: 'Expense recoveries, year 1' },
        { fact: 'base_rent_year_two', label: 'Base rent, year 2' },
        { fact: 'cash_flow_year_three', label: 'Cash flow before debt, year 3' },
        { fact: 'cash_flow_year_four', label: 'Cash flow before debt, year 4' },
      ],
    },
    explanation:
      'Abstracting a lease means turning its language into the handful of inputs a model needs: area, start, expiry, rent, escalation and recovery structure. Each wrong input shows up somewhere different. The rent and escalation move base rent every year. The stop moves recoveries. The expiry year moves the whole rollover (downtime, tenant improvements, commissions) from one year to another, which is why the year 3 and year 4 cash flows are the lines most sensitive to it.',
  },
  {
    id: 'argus-simulator-leasesim-enter-mla',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'Enter the market leasing assumptions',
    prompt:
      `${SETTING} The leasing broker has revised the assumptions for when leases expire: "Expect 70% of tenants to renew. If a tenant leaves, the space sits empty for 8 months. A new tenant gets $50 per SF of improvements and 6 months free. A renewing tenant gets $10 per SF and 1 month free. Commissions and the five-year term are unchanged." Enter the broker’s assumptions.`,
    tags: ['market leasing assumptions', 'renewal probability', 'downtime', 'lease simulator'],
    estMinutes: 5,
    hints: [
      'Match each sentence of the broker’s note to one input. Leave alone anything the note says is unchanged.',
      'Type percentages as percentages: 70, not 0.7.',
      'Renewal probability 70, downtime 8, TI new 50, TI renewal 10, free rent on renewal 1. Free rent for a new lease is already 6.',
    ],
    scenario: SORRENTO_OFFICE,
    editable: ['mla.renewalProbability', 'mla.downtimeMonths', 'mla.termYears', 'mla.tiNew', 'mla.tiRenew', 'mla.lcNew', 'mla.lcRenew', 'mla.freeNew', 'mla.freeRenew'],
    task: {
      kind: 'configure',
      target: { 'mla.renewalProbability': 0.7, 'mla.downtimeMonths': 8, 'mla.tiNew': 50, 'mla.tiRenew': 10, 'mla.freeRenew': 1 },
      checks: [
        { fact: 'turnover_vacancy_year_three', label: 'Turnover vacancy, year 3' },
        { fact: 'free_rent_year_three', label: 'Free rent, year 3' },
        { fact: 'ti_year_three', label: 'Tenant improvements, year 3' },
        { fact: 'cash_flow_year_four', label: 'Cash flow before debt, year 4' },
      ],
    },
    explanation:
      'The model blends the two outcomes by the renewal probability. With 70% renewing, blended downtime is 30% of 8 months, blended improvements are 70% of the renewal figure plus 30% of the new-tenant figure, and so on. One probability therefore moves four lines at once: turnover vacancy, free rent, tenant improvements and commissions.',
  },
  {
    id: 'argus-simulator-leasesim-shock-renewal',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'Predict: tenants become less likely to renew',
    prompt: `${SETTING} Suite 300 rolls in year 3.`,
    tags: ['renewal probability', 'rollover', 'predict', 'lease simulator'],
    estMinutes: 3,
    hints: [
      'Which lines of the rollover year depend on whether the tenant stays?',
      'A tenant who leaves costs downtime, a bigger improvement allowance, a full commission and more free rent.',
    ],
    scenario: SORRENTO_OFFICE,
    variants: [{}, { 'mla.tiNew': 55 }, { 'mla.downtimeMonths': 10 }],
    task: {
      kind: 'shock',
      change: { path: 'mla.renewalProbability', set: 0.4, label: 'The renewal probability falls from 65% to 40%' },
      output: { fact: 'cash_flow_year_three', label: 'Cash flow before debt in year 3', format: 'usd' },
      trap: 'A lower renewal probability does not change the rent on the new lease, but it raises every cost of getting there: more blended downtime, more free rent, larger tenant improvements and a larger commission. Year 3 cash flow falls.',
    },
    explanation:
      'Renewal probability is a single input with four effects, all in the same direction. At 40% the blended downtime is 60% of 9 months instead of 35%, and the blended improvement allowance and commission move toward the expensive new-tenant figures. Suite 300 is only a fifth of the building, yet the building’s year 3 cash flow moves by a large percentage, because leasing costs land in one year while rent is spread over many.',
  },
  {
    id: 'argus-simulator-leasesim-shock-expense-growth',
    type: 'leasesim',
    level: 2,
    topic: 'argus-simulator',
    title: 'Predict: expenses grow faster',
    prompt: `${SETTING} By year 5 two of the four suites are on new triple-net leases, one tenant is on a base-year lease and one is on a gross lease.`,
    tags: ['expense growth', 'recoveries', 'NOI', 'predict', 'lease simulator'],
    estMinutes: 3,
    hints: [
      'Ask who pays for an increase in expenses under each lease structure.',
      'Triple-net and base-year tenants reimburse increases. A gross tenant does not, and vacant or free-rent periods recover nothing.',
    ],
    scenario: SORRENTO_OFFICE,
    variants: [{}, { 'building.expensesYear1': 560000 }, { 'mla.renewalProbability': 0.8 }],
    task: {
      kind: 'shock',
      change: { path: 'building.expenseGrowth', set: 0.06, label: 'Operating expenses grow 6% a year instead of 3%' },
      output: { fact: 'noi_year_five', label: 'NOI in year 5', format: 'usd' },
      band: 0.4,
      trap: 'Higher expenses do not fall straight to the bottom line here, but they do not vanish either. Tenants on triple-net and base-year leases reimburse their share of the increase; the gross tenant reimburses none of it, so the landlord absorbs that share and NOI falls.',
    },
    explanation:
      'By year 5, expenses are well above the 3% path. Most of the extra cost is passed through: the two triple-net tenants pay their full share and the base-year tenant pays its share of the increase. The gross tenant (a quarter of the building) pays nothing extra, so roughly a quarter of the increase lands on the landlord, trimmed a little further by the vacancy and credit loss allowances. NOI falls by a small percentage, far less than expenses rose. With an all-gross rent roll the same change would hit NOI in full.',
  },
]);
