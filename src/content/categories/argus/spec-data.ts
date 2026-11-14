/** Machine-checked data for argus/BUILD_SPEC.md. After editing, run `npm run sync-specs`. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'argus-ex-nnn',
      title: 'Pro rata share and a triple-net recovery',
      concept:
        'Pro rata share = tenant rentable area / building rentable area. Under a triple-net (NNN) lease the tenant reimburses its share of ALL recoverable operating expenses.',
      given: [
        { name: 'building_sf', label: 'Building rentable area (SF)', value: 60000, format: 'int' },
        { name: 'tenant_sf', label: 'Tenant rentable area (SF)', value: 12000, format: 'int' },
        { name: 'opex', label: 'Recoverable operating expenses', value: 780000, format: 'usd' },
      ],
      steps: [
        { name: 'share', label: 'Pro rata share', formula: '=tenant_sf/building_sf', format: 'pct1' },
        { name: 'recovery', label: 'NNN recovery', formula: '=opex*share', format: 'usd' },
        { name: 'recovery_psf', label: 'Recovery per tenant SF', formula: '=recovery/tenant_sf', format: 'usd2' },
      ],
      note: 'Recovery per SF equals building expenses per SF (opex / building_sf). That identity is a quick check.',
    },
    {
      id: 'argus-ex-base-year',
      title: 'Base-year lease',
      concept:
        'The landlord pays expenses up to the amount of the base year (usually the first lease year). The tenant reimburses only its share of the INCREASE over the base year, and never less than zero.',
      given: [
        { name: 'share', label: 'Pro rata share', value: 0.2, format: 'pct1' },
        { name: 'opex', label: 'Operating expenses this year', value: 780000, format: 'usd' },
        { name: 'base_year', label: 'Base-year operating expenses', value: 690000, format: 'usd' },
        { name: 'opex_low', label: 'Expenses in a year they fall', value: 650000, format: 'usd' },
      ],
      steps: [
        { name: 'recovery', label: 'Recovery this year', formula: '=MAX(0,opex-base_year)*share', format: 'usd' },
        { name: 'recovery_low', label: 'Recovery in the low year', formula: '=MAX(0,opex_low-base_year)*share', format: 'usd' },
        { name: 'landlord_cost', label: 'Landlord keeps paying (this tenant’s share of the base)', formula: '=base_year*share', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-expense-stop',
      title: 'Expense stop',
      concept:
        'A stop is a fixed dollar amount per SF. The tenant reimburses expenses per SF above the stop, times its own area. It is a base year expressed as a negotiated number rather than an actual year.',
      given: [
        { name: 'building_sf', label: 'Building rentable area (SF)', value: 60000, format: 'int' },
        { name: 'tenant_sf', label: 'Tenant rentable area (SF)', value: 12000, format: 'int' },
        { name: 'opex', label: 'Operating expenses this year', value: 780000, format: 'usd' },
        { name: 'stop', label: 'Expense stop ($/SF)', value: 12, format: 'usd2' },
      ],
      steps: [
        { name: 'opex_psf', label: 'Expenses per SF', formula: '=opex/building_sf', format: 'usd2' },
        { name: 'excess_psf', label: 'Excess over the stop', formula: '=MAX(0,opex_psf-stop)', format: 'usd2' },
        { name: 'recovery', label: 'Recovery', formula: '=excess_psf*tenant_sf', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-gross-up',
      title: 'Grossing up variable expenses',
      concept:
        'Variable expenses (janitorial, utilities, management) fall when a building is partly empty. Leases let the landlord "gross up" variable expenses to a stated occupancy (often 95%) so that occupied tenants pay a fair share and a low-occupancy base year is not locked in. Fixed expenses are not grossed up.',
      given: [
        { name: 'fixed', label: 'Fixed expenses (taxes, insurance)', value: 480000, format: 'usd' },
        { name: 'variable', label: 'Variable expenses at actual occupancy', value: 300000, format: 'usd' },
        { name: 'occ', label: 'Actual occupancy', value: 0.8, format: 'pct' },
        { name: 'gross_occ', label: 'Gross-up occupancy in the lease', value: 0.95, format: 'pct' },
      ],
      steps: [
        { name: 'variable_grossed', label: 'Variable expenses, grossed up', formula: '=variable*gross_occ/occ', format: 'usd' },
        { name: 'total_grossed', label: 'Expenses used for recoveries', formula: '=fixed+variable_grossed', format: 'usd' },
        { name: 'uplift', label: 'Increase from the gross-up', formula: '=total_grossed-(fixed+variable)', format: 'usd' },
      ],
      note: 'A common bug is grossing up the fixed expenses too.',
    },
    {
      id: 'argus-ex-escalation',
      title: 'Fixed annual escalations',
      concept:
        'With fixed percentage steps, rent in lease year n = year-1 rent x (1 + step)^(n - 1). Year 1 has no escalation.',
      given: [
        { name: 'tenant_sf', label: 'Tenant area (SF)', value: 12000, format: 'int' },
        { name: 'rent', label: 'Year-1 base rent ($/SF/yr)', value: 36, format: 'usd2' },
        { name: 'step', label: 'Annual escalation', value: 0.03, format: 'pct1' },
        { name: 'yr', label: 'Lease year wanted', value: 6, format: 'int' },
      ],
      steps: [
        { name: 'rent_psf', label: 'Rent per SF in that year', formula: '=rent*(1+step)^(yr-1)', format: 'usd2' },
        { name: 'annual_rent', label: 'Annual base rent', formula: '=tenant_sf*rent_psf', format: 'usd' },
        { name: 'wrong_extra_step', label: 'TRAP: one escalation too many', formula: '=tenant_sf*rent*(1+step)^yr', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-ner',
      title: 'Free rent, TI, commissions and net effective rent',
      concept:
        'Net effective rent (NER) spreads the landlord’s concessions over the lease term: (total base rent - free rent - tenant improvements - leasing commissions) / term, per SF per year. This simple version is undiscounted and uses flat rent. Convention used here: the commission is paid on rent actually payable (after free rent).',
      given: [
        { name: 'rent', label: 'Face rent ($/SF/yr, flat)', value: 36, format: 'usd2' },
        { name: 'term_yrs', label: 'Term (years)', value: 5, format: 'int' },
        { name: 'free_mo', label: 'Free rent (months)', value: 4, format: 'int' },
        { name: 'ti', label: 'Tenant improvement allowance ($/SF)', value: 40, format: 'usd2' },
        { name: 'lc_pct', label: 'Leasing commission (% of rent payable)', value: 0.06, format: 'pct' },
      ],
      steps: [
        { name: 'gross_rent', label: 'Face rent over the term ($/SF)', formula: '=rent*term_yrs', format: 'usd2' },
        { name: 'free_value', label: 'Free rent ($/SF)', formula: '=rent*free_mo/12', format: 'usd2' },
        { name: 'payable', label: 'Rent actually payable ($/SF)', formula: '=gross_rent-free_value', format: 'usd2' },
        { name: 'lc', label: 'Leasing commission ($/SF)', formula: '=lc_pct*payable', format: 'usd2' },
        { name: 'ner', label: 'Net effective rent ($/SF/yr)', formula: '=(payable-ti-lc)/term_yrs', format: 'usd2' },
        { name: 'ner_share', label: 'NER as a share of face rent', formula: '=ner/rent', format: 'pct1' },
      ],
    },
    {
      id: 'argus-ex-mla',
      title: 'Blended market leasing assumptions',
      concept:
        'At lease expiry the tenant either renews (probability p) or leaves. Lease-by-lease models blend the two outcomes: blended value = p x renewal value + (1 - p) x new-tenant value. Downtime applies only if the tenant leaves, so blended downtime = (1 - p) x downtime.',
      given: [
        { name: 'renew_prob', label: 'Renewal probability', value: 0.65, format: 'pct' },
        { name: 'downtime_new', label: 'Months vacant if the tenant leaves', value: 9, format: 'int' },
        { name: 'ti_new', label: 'TI for a new tenant ($/SF)', value: 45, format: 'usd2' },
        { name: 'ti_renew', label: 'TI on renewal ($/SF)', value: 15, format: 'usd2' },
        { name: 'lc_new', label: 'Commission, new lease', value: 0.06, format: 'pct' },
        { name: 'lc_renew', label: 'Commission, renewal', value: 0.03, format: 'pct' },
        { name: 'free_new', label: 'Free rent, new lease (months)', value: 6, format: 'int' },
        { name: 'free_renew', label: 'Free rent, renewal (months)', value: 2, format: 'int' },
      ],
      steps: [
        { name: 'downtime', label: 'Blended downtime (months)', formula: '=(1-renew_prob)*downtime_new', format: 'num2' },
        { name: 'ti', label: 'Blended TI ($/SF)', formula: '=renew_prob*ti_renew+(1-renew_prob)*ti_new', format: 'usd2' },
        { name: 'lc', label: 'Blended commission', formula: '=renew_prob*lc_renew+(1-renew_prob)*lc_new', format: 'pct2' },
        { name: 'free', label: 'Blended free rent (months)', formula: '=renew_prob*free_renew+(1-renew_prob)*free_new', format: 'num2' },
      ],
      note: 'The classic slip is weighting by the renewal probability the wrong way round (p x new + (1 - p) x renewal).',
    },
    {
      id: 'argus-ex-rollover',
      title: 'Cost of one lease rolling',
      concept:
        'Apply the blended assumptions to the expiring space: lost rent during downtime, tenant improvements and a commission on the new lease’s rent.',
      given: [
        { name: 'tenant_sf', label: 'Expiring space (SF)', value: 10000, format: 'int' },
        { name: 'market_rent', label: 'Market rent at expiry ($/SF/yr)', value: 42, format: 'usd2' },
        { name: 'downtime', label: 'Blended downtime (months)', value: 3.15, format: 'num2' },
        { name: 'ti', label: 'Blended TI ($/SF)', value: 25.5, format: 'usd2' },
        { name: 'lc', label: 'Blended commission', value: 0.0405, format: 'pct2' },
        { name: 'new_term', label: 'New lease term (years)', value: 5, format: 'int' },
      ],
      steps: [
        { name: 'lost_rent', label: 'Rent lost to downtime', formula: '=tenant_sf*market_rent*downtime/12', format: 'usd' },
        { name: 'ti_cost', label: 'Tenant improvements', formula: '=tenant_sf*ti', format: 'usd' },
        { name: 'lc_cost', label: 'Leasing commission', formula: '=lc*tenant_sf*market_rent*new_term', format: 'usd' },
        { name: 'total', label: 'Total cost of the rollover', formula: '=lost_rent+ti_cost+lc_cost', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-vacancy',
      title: 'General vacancy, turnover vacancy and credit loss',
      concept:
        'Turnover vacancy is the downtime the model already projects lease by lease. General vacancy is a market-wide allowance (a % of potential gross revenue). To avoid counting vacancy twice, the general allowance is reduced by the turnover vacancy already in the cash flow, and never below zero. Credit loss (tenants who occupy but do not pay) is a separate line.',
      given: [
        { name: 'pgr', label: 'Potential gross revenue', value: 2400000, format: 'usd' },
        { name: 'turnover', label: 'Turnover vacancy already modelled', value: 96000, format: 'usd' },
        { name: 'general_pct', label: 'General vacancy allowance', value: 0.05, format: 'pct' },
        { name: 'credit_pct', label: 'Credit loss', value: 0.01, format: 'pct' },
      ],
      steps: [
        { name: 'allowance', label: 'General vacancy target', formula: '=general_pct*pgr', format: 'usd' },
        { name: 'general', label: 'General vacancy line (net of turnover)', formula: '=MAX(0,allowance-turnover)', format: 'usd' },
        { name: 'credit', label: 'Credit loss', formula: '=credit_pct*pgr', format: 'usd' },
        { name: 'egr', label: 'Effective gross revenue', formula: '=pgr-turnover-general-credit', format: 'usd' },
        { name: 'double_count', label: 'TRAP: full allowance on top of turnover', formula: '=pgr-turnover-allowance-credit', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-percentage-rent',
      title: 'Percentage rent with a natural breakpoint',
      concept:
        'Retail leases often add percentage rent: a share of the tenant’s sales above a breakpoint. The natural breakpoint is base rent / percentage, the sales level at which the percentage alone would equal base rent.',
      given: [
        { name: 'base_rent', label: 'Annual base rent', value: 180000, format: 'usd' },
        { name: 'pct', label: 'Percentage rent rate', value: 0.06, format: 'pct' },
        { name: 'sales', label: 'Tenant sales this year', value: 3400000, format: 'usd' },
      ],
      steps: [
        { name: 'breakpoint', label: 'Natural breakpoint', formula: '=base_rent/pct', format: 'usd' },
        { name: 'overage', label: 'Percentage rent', formula: '=MAX(0,sales-breakpoint)*pct', format: 'usd' },
        { name: 'total_rent', label: 'Total rent', formula: '=base_rent+overage', format: 'usd' },
      ],
    },
    {
      id: 'argus-ex-valuation',
      title: 'Reading the valuation page: PV of cash flow plus resale',
      concept:
        'A lease-by-lease valuation discounts each year’s cash flow and a resale. The resale capitalises the NOI of the year AFTER the hold (year 6 for a 5-year hold) at the exit cap rate, less selling costs.',
      given: [
        { name: 'cf_a', label: 'Year 1 cash flow before debt', value: 1150000, format: 'usd' },
        { name: 'cf_b', label: 'Year 2', value: 1210000, format: 'usd' },
        { name: 'cf_c', label: 'Year 3', value: 980000, format: 'usd' },
        { name: 'cf_d', label: 'Year 4', value: 1290000, format: 'usd' },
        { name: 'cf_e', label: 'Year 5', value: 1340000, format: 'usd' },
        { name: 'noi_next', label: 'Year 6 NOI', value: 1420000, format: 'usd' },
        { name: 'exit_cap', label: 'Exit cap rate', value: 0.065, format: 'pct2' },
        { name: 'sale_cost', label: 'Selling costs', value: 0.02, format: 'pct' },
        { name: 'disc', label: 'Discount rate', value: 0.08, format: 'pct2' },
      ],
      steps: [
        { name: 'gross_resale', label: 'Gross resale value', formula: '=noi_next/exit_cap', format: 'usd' },
        { name: 'net_resale', label: 'Net resale proceeds', formula: '=gross_resale*(1-sale_cost)', format: 'usd' },
        { name: 'pv', label: 'Present value', formula: '=NPV(disc,cf_a,cf_b,cf_c,cf_d,cf_e+net_resale)', format: 'usd' },
        { name: 'resale_share', label: 'Share of value from the resale', formula: '=net_resale/(1+disc)^5/pv', format: 'pct1' },
      ],
      note: 'Year 3 dips because a large lease rolls (downtime, TI and commissions). Spotting why a year dips is a core report-reading skill.',
    },
  ],
  typeMix: {
    flashcard: 9,
    mcq: 8,
    numeric: 12,
    estimate: 2,
    grid: 11,
    formula: 3,
    errorhunt: 5,
    predict: 3,
    order: 2,
    explain: 2,
    docreview: 5,
    judgment: 1,
    leasesim: 6,
    timed: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'argus-recoveries-grid-three-structures, argus-baserent-numeric-escalated-year' },
    { title: 'Chunk 1', items: 16, scope: 'argus-rentroll (8) and argus-baserent (8 more)' },
    { title: 'Chunk 2', items: 18, scope: 'argus-recoveries (10 more) and argus-concessions (8)' },
    { title: 'Chunk 3', items: 18, scope: 'argus-mla (11) and argus-vacancy (7)' },
    { title: 'Chunk 4', items: 9, scope: 'Build the lease engine, the simulator component and the leasesim type (section 13); argus-simulator (6) and the first 3 of argus-reports' },
    { title: 'Chunk 5', items: 7, scope: 'argus-reports (6 more) and the capstone argus-case (1); set status to built' },
  ],
};
