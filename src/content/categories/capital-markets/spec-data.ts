/** Machine-checked data for capital-markets/BUILD_SPEC.md. After editing, run `npm run sync-specs`. Rates and terms are illustrative. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'cap-ex-stack',
      title: 'Capital stack shares and blended cost',
      concept:
        'The capital stack orders the money in a deal by priority: senior debt is repaid first and is cheapest; mezzanine and preferred equity sit in the middle; common equity is last and most expensive. Blended cost = sum of share x cost.',
      given: [
        { name: 'senior_share', label: 'Senior loan share of cost', value: 0.6, format: 'pct' },
        { name: 'senior_cost', label: 'Senior loan rate', value: 0.065, format: 'pct2' },
        { name: 'mezz_share', label: 'Mezzanine share', value: 0.15, format: 'pct' },
        { name: 'mezz_cost', label: 'Mezzanine rate', value: 0.11, format: 'pct2' },
        { name: 'equity_cost', label: 'Equity target return', value: 0.18, format: 'pct2' },
      ],
      steps: [
        { name: 'equity_share', label: 'Common equity share', formula: '=1-senior_share-mezz_share', format: 'pct' },
        { name: 'blended', label: 'Blended cost of capital', formula: '=senior_share*senior_cost+mezz_share*mezz_cost+equity_share*equity_cost', format: 'pct2' },
        { name: 'debt_only', label: 'Blended cost of the debt layers', formula: '=(senior_share*senior_cost+mezz_share*mezz_cost)/(senior_share+mezz_share)', format: 'pct2' },
      ],
    },
    {
      id: 'cap-ex-loss',
      title: 'Who loses when value falls',
      concept:
        'Losses are absorbed from the bottom of the stack up. If value falls by more than the equity share, the next layer starts to lose. This is why junior capital costs more.',
      given: [
        { name: 'value', label: 'Original value', value: 50000000, format: 'usd' },
        { name: 'senior', label: 'Senior loan', value: 30000000, format: 'usd' },
        { name: 'mezz', label: 'Mezzanine loan', value: 7500000, format: 'usd' },
        { name: 'decline', label: 'Fall in value', value: 0.3, format: 'pct' },
      ],
      steps: [
        { name: 'equity', label: 'Common equity', formula: '=value-senior-mezz', format: 'usd' },
        { name: 'new_value', label: 'Value after the fall', formula: '=value*(1-decline)', format: 'usd' },
        { name: 'equity_left', label: 'Equity remaining', formula: '=MAX(0,new_value-senior-mezz)', format: 'usd' },
        { name: 'mezz_recovery', label: 'Mezzanine recovered', formula: '=MAX(0,MIN(mezz,new_value-senior))', format: 'usd' },
        { name: 'mezz_loss', label: 'Mezzanine loss', formula: '=1-mezz_recovery/mezz', format: 'pct1' },
        { name: 'senior_recovery', label: 'Senior recovered', formula: '=MIN(senior,new_value)', format: 'usd' },
      ],
    },
    {
      id: 'cap-ex-floating',
      title: 'Floating rate with an index floor',
      concept: 'A floating-rate loan charges an index (SOFR) plus a spread. A floor sets a minimum for the index: all-in rate = MAX(index, floor) + spread. Spreads are quoted in basis points (100 bps = 1%).',
      given: [
        { name: 'sofr', label: 'SOFR (illustrative)', value: 0.043, format: 'pct2' },
        { name: 'spread_bps', label: 'Spread (bps)', value: 300, format: 'int' },
        { name: 'floor', label: 'Index floor', value: 0.03, format: 'pct2' },
        { name: 'low_sofr', label: 'SOFR in a low-rate scenario', value: 0.02, format: 'pct2' },
        { name: 'loan', label: 'Loan balance', value: 30000000, format: 'usd' },
      ],
      steps: [
        { name: 'rate', label: 'All-in rate today', formula: '=MAX(sofr,floor)+spread_bps/10000', format: 'pct2' },
        { name: 'rate_low', label: 'All-in rate if SOFR falls', formula: '=MAX(low_sofr,floor)+spread_bps/10000', format: 'pct2' },
        { name: 'interest', label: 'Annual interest today', formula: '=loan*rate', format: 'usd' },
      ],
    },
    {
      id: 'cap-ex-cap',
      title: 'Interest rate cap payoff',
      concept: 'A cap pays the borrower (index - strike) x balance whenever the index is above the strike, and nothing otherwise. The loan itself is unchanged.',
      given: [
        { name: 'loan', label: 'Loan balance', value: 30000000, format: 'usd' },
        { name: 'strike', label: 'Cap strike', value: 0.045, format: 'pct2' },
        { name: 'sofr', label: 'SOFR for the year', value: 0.054, format: 'pct2' },
        { name: 'spread', label: 'Spread', value: 0.03, format: 'pct2' },
      ],
      steps: [
        { name: 'lender_interest', label: 'Interest paid to the lender', formula: '=loan*(sofr+spread)', format: 'usd' },
        { name: 'cap_payment', label: 'Paid by the cap provider', formula: '=MAX(0,sofr-strike)*loan', format: 'usd' },
        { name: 'net_cost', label: 'Net interest cost', formula: '=lender_interest-cap_payment', format: 'usd' },
        { name: 'effective_rate', label: 'Effective rate', formula: '=net_cost/loan', format: 'pct2' },
      ],
    },
    {
      id: 'cap-ex-sizing',
      title: 'Permanent loan sizing: the lender takes the lowest of three',
      concept:
        'A lender sizes to several tests and lends the smallest result: loan-to-value (value x LTV), debt service coverage (the loan whose payment is NOI / DSCR) and debt yield (NOI / minimum debt yield).',
      given: [
        { name: 'noi', label: 'Underwritten NOI', value: 2400000, format: 'usd' },
        { name: 'value', label: 'Appraised value', value: 40000000, format: 'usd' },
        { name: 'max_ltv', label: 'Maximum LTV', value: 0.65, format: 'pct' },
        { name: 'min_dscr', label: 'Minimum DSCR', value: 1.25, format: 'num2' },
        { name: 'rate', label: 'Loan rate', value: 0.065, format: 'pct2' },
        { name: 'amort_years', label: 'Amortisation (years)', value: 30, format: 'int' },
        { name: 'min_dy', label: 'Minimum debt yield', value: 0.09, format: 'pct' },
      ],
      steps: [
        { name: 'by_ltv', label: 'Loan by LTV', formula: '=value*max_ltv', format: 'usd' },
        { name: 'max_payment', label: 'Largest annual debt service', formula: '=noi/min_dscr', format: 'usd' },
        { name: 'by_dscr', label: 'Loan by DSCR', formula: '=PV(rate/12,amort_years*12,-max_payment/12)', format: 'usd' },
        { name: 'by_dy', label: 'Loan by debt yield', formula: '=noi/min_dy', format: 'usd' },
        { name: 'loan', label: 'Loan offered', formula: '=MIN(by_ltv,by_dscr,by_dy)', format: 'usd' },
      ],
      note: 'DSCR binds here. If rates fell, the DSCR loan would grow and LTV would take over.',
    },
    {
      id: 'cap-ex-construction',
      title: 'Construction loan: loan-to-cost and the equity requirement',
      concept: 'Construction lenders size to cost (LTC) and to the value on completion (LTV), and require the equity to go in first.',
      given: [
        { name: 'cost', label: 'Total project cost', value: 50000000, format: 'usd' },
        { name: 'max_ltc', label: 'Maximum LTC', value: 0.65, format: 'pct' },
        { name: 'completed_value', label: 'Value at stabilisation', value: 62000000, format: 'usd' },
        { name: 'max_ltv', label: 'Maximum LTV on completed value', value: 0.55, format: 'pct' },
      ],
      steps: [
        { name: 'by_ltc', label: 'Loan by LTC', formula: '=cost*max_ltc', format: 'usd' },
        { name: 'by_ltv', label: 'Loan by LTV', formula: '=completed_value*max_ltv', format: 'usd' },
        { name: 'loan', label: 'Loan', formula: '=MIN(by_ltc,by_ltv)', format: 'usd' },
        { name: 'equity', label: 'Equity required (funded first)', formula: '=cost-loan', format: 'usd' },
      ],
    },
    {
      id: 'cap-ex-interest-reserve',
      title: 'Estimating an interest reserve',
      concept:
        'A construction loan is drawn over time, so interest accrues on a rising balance. A quick estimate: average balance (a share of the commitment) x rate x construction period. A full model builds it month by month.',
      given: [
        { name: 'commitment', label: 'Loan commitment', value: 32500000, format: 'usd' },
        { name: 'avg_drawn', label: 'Average share drawn', value: 0.55, format: 'pct' },
        { name: 'rate', label: 'Interest rate', value: 0.08, format: 'pct2' },
        { name: 'months', label: 'Construction and lease-up (months)', value: 24, format: 'int' },
      ],
      steps: [
        { name: 'avg_balance', label: 'Average balance', formula: '=commitment*avg_drawn', format: 'usd' },
        { name: 'reserve', label: 'Interest reserve estimate', formula: '=avg_balance*rate*months/12', format: 'usd' },
        { name: 'share', label: 'Reserve as % of the commitment', formula: '=reserve/commitment', format: 'pct1' },
      ],
    },
    {
      id: 'cap-ex-refinance',
      title: 'Refinance proceeds and cash out',
      concept: 'At stabilisation a permanent loan replaces the construction loan. Cash out = new loan - payoff - closing costs. It can be negative (a "cash-in" refinance).',
      given: [
        { name: 'noi', label: 'Stabilised NOI', value: 3100000, format: 'usd' },
        { name: 'cap', label: 'Cap rate', value: 0.055, format: 'pct2' },
        { name: 'max_ltv', label: 'Maximum LTV', value: 0.65, format: 'pct' },
        { name: 'payoff', label: 'Construction loan payoff', value: 32500000, format: 'usd' },
        { name: 'cost_pct', label: 'Refinancing costs (% of new loan)', value: 0.01, format: 'pct' },
      ],
      steps: [
        { name: 'value', label: 'Value', formula: '=noi/cap', format: 'usd' },
        { name: 'new_loan', label: 'New loan', formula: '=value*max_ltv', format: 'usd' },
        { name: 'costs', label: 'Refinancing costs', formula: '=new_loan*cost_pct', format: 'usd' },
        { name: 'cash_out', label: 'Cash out to equity', formula: '=new_loan-payoff-costs', format: 'usd' },
      ],
    },
    {
      id: 'cap-ex-extension-test',
      title: 'Debt yield extension test and the paydown to pass it',
      concept: 'Debt yield = NOI / loan. If an extension requires a minimum debt yield, the largest loan that passes is NOI / test, and the paydown is the excess.',
      given: [
        { name: 'loan', label: 'Loan balance', value: 30000000, format: 'usd' },
        { name: 'noi', label: 'NOI', value: 2070000, format: 'usd' },
        { name: 'test', label: 'Required debt yield', value: 0.08, format: 'pct1' },
      ],
      steps: [
        { name: 'dy', label: 'Debt yield today', formula: '=noi/loan', format: 'pct1' },
        { name: 'max_loan', label: 'Largest loan that passes', formula: '=noi/test', format: 'usd' },
        { name: 'paydown', label: 'Paydown needed', formula: '=MAX(0,loan-max_loan)', format: 'usd' },
        { name: 'noi_needed', label: 'Or: NOI needed with no paydown', formula: '=loan*test', format: 'usd' },
      ],
    },
    {
      id: 'cap-ex-leverage',
      title: 'Positive and negative leverage',
      concept:
        'The loan constant is annual debt service / loan. If the property’s cap rate is above the loan constant, borrowing raises the cash-on-cash return (positive leverage); if below, it lowers it.',
      given: [
        { name: 'price', label: 'Price', value: 40000000, format: 'usd' },
        { name: 'cap', label: 'Cap rate', value: 0.055, format: 'pct2' },
        { name: 'ltv', label: 'LTV', value: 0.6, format: 'pct' },
        { name: 'rate', label: 'Loan rate', value: 0.065, format: 'pct2' },
        { name: 'amort_years', label: 'Amortisation (years)', value: 30, format: 'int' },
      ],
      steps: [
        { name: 'loan', label: 'Loan', formula: '=price*ltv', format: 'usd' },
        { name: 'debt_service', label: 'Annual debt service', formula: '=-PMT(rate/12,amort_years*12,loan)*12', format: 'usd' },
        { name: 'constant', label: 'Loan constant', formula: '=debt_service/loan', format: 'pct2' },
        { name: 'cash_on_cash', label: 'Cash-on-cash return', formula: '=(price*cap-debt_service)/(price-loan)', format: 'pct2' },
        { name: 'spread', label: 'Cap rate minus loan constant', formula: '=cap-constant', format: 'pct2' },
      ],
      note: 'The cap rate (5.50%) is below the loan constant, so leverage is negative: cash-on-cash is lower than the unlevered 5.50%.',
    },
    {
      id: 'cap-ex-prepay',
      title: 'Step-down prepayment penalty',
      concept: 'Many loans charge a penalty for early repayment. A step-down schedule (for example 3%, 2%, 1% of the balance in years 1, 2, 3) is the simplest form. Yield maintenance and defeasance are the alternatives on fixed-rate loans: explain them in words only.',
      given: [
        { name: 'balance', label: 'Balance at payoff', value: 25800000, format: 'usd' },
        { name: 'penalty_pct', label: 'Penalty in the payoff year', value: 0.02, format: 'pct' },
        { name: 'sale_price', label: 'Sale price', value: 41000000, format: 'usd' },
        { name: 'sale_costs', label: 'Selling costs', value: 0.015, format: 'pct1' },
      ],
      steps: [
        { name: 'penalty', label: 'Prepayment penalty', formula: '=balance*penalty_pct', format: 'usd' },
        { name: 'net_proceeds', label: 'Net proceeds to equity', formula: '=sale_price*(1-sale_costs)-balance-penalty', format: 'usd' },
      ],
    },
  ],
  typeMix: {
    flashcard: 7,
    mcq: 7,
    numeric: 7,
    grid: 7,
    errorhunt: 2,
    predict: 2,
    order: 1,
    explain: 2,
    judgment: 3,
    gonogo: 1,
    case: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'capital-markets-rates-grid-rate-cap, capital-markets-refinance-judgment-extension-test' },
    { title: 'Chunk 1', items: 21, scope: 'capital-markets-loan-types (8), capital-markets-stack (7), capital-markets-rates (6 more)' },
    { title: 'Chunk 2', items: 17, scope: 'capital-markets-sizing (8), capital-markets-recourse (4), capital-markets-refinance (4 more), mini-case capital-markets-case (1); set status to built' },
  ],
};
