/** Machine-checked data for acquisitions/BUILD_SPEC.md. After editing, run `npm run sync-specs`. Figures are illustrative; tax and fee rates are placeholders to verify. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'acq-ex-normalise',
      title: 'Normalising a T-12 to underwritten NOI',
      concept:
        'Underwritten NOI restates the seller’s trailing-12 as the buyer’s first year: remove non-recurring income, reset property tax to the purchase price, and use a market management fee. Tax rate shown is illustrative; look up the property’s actual rate.',
      given: [
        { name: 'seller_noi', label: 'Seller’s T-12 NOI', value: 1180000, format: 'usd' },
        { name: 'one_time', label: 'One-time income in the T-12', value: 45000, format: 'usd' },
        { name: 'egi', label: 'Recurring effective gross income', value: 1800000, format: 'usd' },
        { name: 'seller_mgmt', label: 'Management fee in the T-12', value: 18000, format: 'usd' },
        { name: 'market_mgmt_pct', label: 'Market management fee', value: 0.03, format: 'pct' },
        { name: 'seller_taxes', label: 'Seller’s property taxes', value: 87000, format: 'usd' },
        { name: 'price', label: 'Purchase price', value: 22000000, format: 'usd' },
        { name: 'tax_rate', label: 'Property tax rate (illustrative)', value: 0.012, format: 'pct2' },
      ],
      steps: [
        { name: 'new_mgmt', label: 'Management fee at market', formula: '=egi*market_mgmt_pct', format: 'usd' },
        { name: 'new_taxes', label: 'Property taxes after reassessment', formula: '=price*tax_rate', format: 'usd' },
        { name: 'uw_noi', label: 'Underwritten NOI', formula: '=seller_noi-one_time-(new_mgmt-seller_mgmt)-(new_taxes-seller_taxes)', format: 'usd' },
        { name: 'haircut', label: 'Reduction from the seller’s NOI', formula: '=1-uw_noi/seller_noi', format: 'pct1' },
        { name: 'seller_cap', label: 'Cap rate on the seller’s NOI', formula: '=seller_noi/price', format: 'pct2' },
        { name: 'true_cap', label: 'Cap rate on underwritten NOI', formula: '=uw_noi/price', format: 'pct2' },
      ],
      note: 'The same price is a very different cap rate on the two NOIs. Always ask which NOI a quoted cap rate uses.',
    },
    {
      id: 'acq-ex-loss-to-lease',
      title: 'Loss-to-lease',
      concept: 'Loss-to-lease is the gap between market rent and the rent in-place leases actually pay. It is upside only as fast as leases roll, and only if the market rent is real.',
      given: [
        { name: 'units', label: 'Units', value: 60, format: 'int' },
        { name: 'market_rent', label: 'Market rent per month', value: 2750, format: 'usd' },
        { name: 'in_place', label: 'Average in-place rent', value: 2600, format: 'usd' },
      ],
      steps: [
        { name: 'ltl_annual', label: 'Loss-to-lease per year', formula: '=units*(market_rent-in_place)*12', format: 'usd' },
        { name: 'ltl_pct', label: 'Loss-to-lease as % of market rent', formula: '=(market_rent-in_place)/market_rent', format: 'pct1' },
        { name: 'gpr_market', label: 'Gross potential rent at market', formula: '=units*market_rent*12', format: 'usd' },
        { name: 'gpr_in_place', label: 'Rent actually scheduled', formula: '=gpr_market-ltl_annual', format: 'usd' },
      ],
    },
    {
      id: 'acq-ex-rent-roll-audit',
      title: 'Rent roll audit: occupancy and rollover exposure',
      concept: 'Tie the rent roll to the T-12, then measure physical occupancy (units), economic occupancy (collected / potential) and how much rent expires soon.',
      given: [
        { name: 'units', label: 'Units', value: 60, format: 'int' },
        { name: 'occupied', label: 'Occupied units', value: 56, format: 'int' },
        { name: 'potential', label: 'Monthly rent if full at market', value: 165000, format: 'usd' },
        { name: 'collected', label: 'Monthly rent actually collected', value: 143200, format: 'usd' },
        { name: 'expiring', label: 'Leases expiring within 90 days', value: 14, format: 'int' },
      ],
      steps: [
        { name: 'physical', label: 'Physical occupancy', formula: '=occupied/units', format: 'pct1' },
        { name: 'economic', label: 'Economic occupancy', formula: '=collected/potential', format: 'pct1' },
        { name: 'gap', label: 'Gap between the two', formula: '=physical-economic', format: 'pct1' },
        { name: 'rollover', label: 'Share of occupied units expiring in 90 days', formula: '=expiring/occupied', format: 'pct1' },
      ],
      note: 'Economic occupancy well below physical points to loss-to-lease, concessions or bad debt. Ask which.',
    },
    {
      id: 'acq-ex-pricing',
      title: 'Offer price from a target cap rate',
      concept: 'Price = underwritten NOI / target cap rate. Check it against price per unit and against the asking price.',
      given: [
        { name: 'uw_noi', label: 'Underwritten NOI', value: 1085000, format: 'usd' },
        { name: 'target_cap', label: 'Target going-in cap rate', value: 0.0525, format: 'pct2' },
        { name: 'units', label: 'Units', value: 60, format: 'int' },
        { name: 'asking', label: 'Asking price', value: 22000000, format: 'usd' },
      ],
      steps: [
        { name: 'offer', label: 'Offer price', formula: '=uw_noi/target_cap', format: 'usd' },
        { name: 'per_unit', label: 'Offer per unit', formula: '=offer/units', format: 'usd' },
        { name: 'discount', label: 'Discount to asking', formula: '=1-offer/asking', format: 'pct1' },
      ],
    },
    {
      id: 'acq-ex-deposit',
      title: 'Earnest money and when it goes hard',
      concept:
        'The buyer posts a deposit into escrow. During the due diligence period it is refundable. After that it "goes hard": the seller keeps it if the buyer fails to close. Many deals add a second deposit when diligence ends.',
      given: [
        { name: 'price', label: 'Purchase price', value: 20650000, format: 'usd' },
        { name: 'initial_pct', label: 'Initial deposit', value: 0.01, format: 'pct' },
        { name: 'second_pct', label: 'Additional deposit at end of diligence', value: 0.01, format: 'pct' },
      ],
      steps: [
        { name: 'initial', label: 'Initial deposit', formula: '=price*initial_pct', format: 'usd' },
        { name: 'at_risk', label: 'At risk once diligence expires', formula: '=price*(initial_pct+second_pct)', format: 'usd' },
        { name: 'due_at_close', label: 'Balance of the price due at closing', formula: '=price-at_risk', format: 'usd' },
      ],
    },
    {
      id: 'acq-ex-retrade',
      title: 'A due diligence finding: price reduction or credit',
      concept:
        'A defect found in diligence (here a roof at the end of its life) can be handled by a price reduction, a seller credit at closing or a seller repair. A reduction equal to the cost keeps the buyer’s all-in basis where it was underwritten.',
      given: [
        { name: 'price', label: 'Contract price', value: 20650000, format: 'usd' },
        { name: 'repair', label: 'Cost to replace the roof', value: 420000, format: 'usd' },
        { name: 'uw_noi', label: 'Underwritten NOI', value: 1085000, format: 'usd' },
      ],
      steps: [
        { name: 'basis_no_fix', label: 'All-in basis if nothing changes', formula: '=price+repair', format: 'usd' },
        { name: 'yield_no_fix', label: 'Yield on all-in basis, no adjustment', formula: '=uw_noi/basis_no_fix', format: 'pct2' },
        { name: 'new_price', label: 'Price after a full reduction', formula: '=price-repair', format: 'usd' },
        { name: 'yield_fixed', label: 'Yield on all-in basis after the reduction', formula: '=uw_noi/(new_price+repair)', format: 'pct2' },
      ],
    },
    {
      id: 'acq-ex-rent-proration',
      title: 'Rent proration',
      concept: 'Rent collected in advance is split by days. Whoever owns the closing day is set by the contract; here the buyer does.',
      given: [
        { name: 'rent', label: 'Monthly rent collected by the seller', value: 86400, format: 'usd' },
        { name: 'days', label: 'Days in the month', value: 30, format: 'int' },
        { name: 'closing_day', label: 'Closing day of the month', value: 18, format: 'int' },
      ],
      steps: [
        { name: 'buyer_days', label: 'Buyer’s days (closing day included)', formula: '=days-closing_day+1', format: 'int' },
        { name: 'credit', label: 'Rent credit to the buyer', formula: '=rent*buyer_days/days', format: 'usd' },
        { name: 'off_by_one', label: 'TRAP: closing day left with the seller', formula: '=rent*(days-closing_day)/days', format: 'usd' },
      ],
    },
    {
      id: 'acq-ex-tax-proration',
      title: 'Property tax proration',
      concept: 'If the seller has not yet paid tax for a period it partly owned, it credits the buyer for its days. If the seller prepaid, the buyer credits the seller for the buyer’s days. Day-count convention (365 or 360) comes from the contract.',
      given: [
        { name: 'period_tax', label: 'Tax for the period', value: 91250, format: 'usd' },
        { name: 'period_days', label: 'Days in the period', value: 182, format: 'int' },
        { name: 'seller_days', label: 'Days the seller owned', value: 140, format: 'int' },
      ],
      steps: [
        { name: 'per_day', label: 'Tax per day', formula: '=period_tax/period_days', format: 'usd2' },
        { name: 'unpaid_credit', label: 'If unpaid: seller credits buyer', formula: '=per_day*seller_days', format: 'usd' },
        { name: 'prepaid_credit', label: 'If prepaid: buyer credits seller', formula: '=per_day*(period_days-seller_days)', format: 'usd' },
      ],
    },
    {
      id: 'acq-ex-closing-costs',
      title: 'Buyer closing costs',
      concept:
        'Closing costs are estimated as line items: title insurance, escrow fee, legal, lender fees, third-party reports, transfer taxes where the buyer pays them. Every rate below is a PLACEHOLDER: who pays what is negotiated and customary by county, and tax rates are set by law.',
      given: [
        { name: 'price', label: 'Purchase price', value: 20650000, format: 'usd' },
        { name: 'loan', label: 'Loan amount', value: 13400000, format: 'usd' },
        { name: 'title_rate', label: 'Title and escrow (PLACEHOLDER, % of price)', value: 0.0015, format: 'pct2' },
        { name: 'lender_fee', label: 'Lender origination fee (illustrative)', value: 0.01, format: 'pct' },
        { name: 'reports', label: 'Legal and third-party reports', value: 145000, format: 'usd' },
      ],
      steps: [
        { name: 'title_cost', label: 'Title and escrow', formula: '=price*title_rate', format: 'usd' },
        { name: 'loan_cost', label: 'Lender fee', formula: '=loan*lender_fee', format: 'usd' },
        { name: 'total', label: 'Total closing costs', formula: '=title_cost+loan_cost+reports', format: 'usd' },
        { name: 'pct_of_price', label: 'As % of price', formula: '=total/price', format: 'pct2' },
      ],
    },
    {
      id: 'acq-ex-sources-uses',
      title: 'Sources and uses at closing',
      concept: 'Uses: price, closing costs, initial reserves. Sources: loan and equity. Equity is what is left, and the deposit already in escrow counts toward it.',
      given: [
        { name: 'price', label: 'Purchase price', value: 20650000, format: 'usd' },
        { name: 'closing_costs', label: 'Closing costs', value: 309975, format: 'usd' },
        { name: 'reserves', label: 'Initial capital reserve', value: 600000, format: 'usd' },
        { name: 'loan', label: 'Loan', value: 13400000, format: 'usd' },
        { name: 'deposit', label: 'Deposit already in escrow', value: 413000, format: 'usd' },
        { name: 'credits', label: 'Proration credits to the buyer', value: 168548, format: 'usd' },
      ],
      steps: [
        { name: 'uses', label: 'Total uses', formula: '=price+closing_costs+reserves', format: 'usd' },
        { name: 'equity', label: 'Equity required', formula: '=uses-loan', format: 'usd' },
        { name: 'wire', label: 'Cash to wire at closing', formula: '=equity-deposit-credits', format: 'usd' },
        { name: 'ltc', label: 'Loan to total cost', formula: '=loan/uses', format: 'pct1' },
      ],
    },
  ],
  typeMix: {
    flashcard: 9,
    mcq: 9,
    numeric: 9,
    estimate: 2,
    grid: 12,
    formula: 2,
    errorhunt: 5,
    order: 4,
    explain: 3,
    docreview: 8,
    judgment: 5,
    gonogo: 1,
    timed: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'acquisitions-underwriting-docreview-t12-normalise, acquisitions-prorations-grid-closing-credits' },
    { title: 'Chunk 1', items: 21, scope: 'acquisitions-sourcing (8) and acquisitions-underwriting (13 more)' },
    { title: 'Chunk 2', items: 18, scope: 'acquisitions-contracts (9) and acquisitions-diligence (9)' },
    { title: 'Chunk 3', items: 15, scope: 'acquisitions-ic-memo (6) and acquisitions-escrow-title (9)' },
    { title: 'Chunk 4', items: 14, scope: 'acquisitions-prorations (9 more), acquisitions-timeline (4) and the capstone acquisitions-case (1); set status to built' },
  ],
};
