/** Machine-checked data for market-analysis/BUILD_SPEC.md. After editing, run `npm run sync-specs`. All market figures are illustrative. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'mkt-ex-vacancy-absorption',
      title: 'Vacancy rate and net absorption',
      concept:
        'Vacancy rate = vacant units / inventory. Net absorption = change in OCCUPIED units over a period. Deliveries add to inventory. Vacancy can rise even when absorption is positive, if deliveries are larger.',
      given: [
        { name: 'inventory_start', label: 'Inventory at start (units)', value: 8000, format: 'int' },
        { name: 'occupied_start', label: 'Occupied at start', value: 7480, format: 'int' },
        { name: 'deliveries', label: 'Units delivered in the period', value: 300, format: 'int' },
        { name: 'occupied_end', label: 'Occupied at end', value: 7640, format: 'int' },
      ],
      steps: [
        { name: 'vacancy_start', label: 'Vacancy at start', formula: '=(inventory_start-occupied_start)/inventory_start', format: 'pct1' },
        { name: 'net_absorption', label: 'Net absorption (units)', formula: '=occupied_end-occupied_start', format: 'int' },
        { name: 'inventory_end', label: 'Inventory at end', formula: '=inventory_start+deliveries', format: 'int' },
        { name: 'vacancy_end', label: 'Vacancy at end', formula: '=(inventory_end-occupied_end)/inventory_end', format: 'pct1' },
      ],
      note: 'Absorption of 160 units against 300 delivered: demand grew, and vacancy still rose.',
    },
    {
      id: 'mkt-ex-months-of-supply',
      title: 'Months to return to stabilised vacancy',
      concept:
        'Excess vacant units = vacant + pipeline - stabilised vacancy x (inventory + pipeline). Months = excess / monthly net absorption. A market is never absorbed to zero vacancy.',
      given: [
        { name: 'inventory', label: 'Existing inventory (units)', value: 8000, format: 'int' },
        { name: 'vacant', label: 'Vacant units', value: 560, format: 'int' },
        { name: 'pipeline', label: 'Under construction (units)', value: 450, format: 'int' },
        { name: 'stab', label: 'Stabilised vacancy', value: 0.05, format: 'pct' },
        { name: 'absorb', label: 'Net absorption per month', value: 40, format: 'int' },
      ],
      steps: [
        { name: 'vacant_after', label: 'Vacant after delivery', formula: '=vacant+pipeline', format: 'int' },
        { name: 'stab_units', label: 'Vacant units at stabilised vacancy', formula: '=stab*(inventory+pipeline)', format: 'num1' },
        { name: 'excess', label: 'Excess to absorb', formula: '=vacant_after-stab_units', format: 'num1' },
        { name: 'months', label: 'Months to stabilise', formula: '=excess/absorb', format: 'num1' },
      ],
    },
    {
      id: 'mkt-ex-effective-rent',
      title: 'Asking rent vs. effective rent',
      concept:
        'Concessions lower the rent actually collected. Effective rent = asking rent x paid months / lease months. Comps must be compared on effective rent.',
      given: [
        { name: 'asking', label: 'Asking rent per month', value: 2800, format: 'usd' },
        { name: 'lease_months', label: 'Lease term (months)', value: 13, format: 'int' },
        { name: 'free_months', label: 'Free months', value: 1, format: 'int' },
      ],
      steps: [
        { name: 'effective', label: 'Effective rent per month', formula: '=asking*(lease_months-free_months)/lease_months', format: 'usd' },
        { name: 'discount', label: 'Concession as a % of asking', formula: '=1-effective/asking', format: 'pct1' },
      ],
    },
    {
      id: 'mkt-ex-rent-comp',
      title: 'Adjusting one rent comp to the subject',
      concept:
        'Adjust the COMP toward the SUBJECT: adjustment = (subject - comp) x value per unit of the feature. Inferior comp → adjust up. Superior comp → adjust down.',
      given: [
        { name: 'comp_rent', label: 'Comp effective rent', value: 2650, format: 'usd' },
        { name: 'subject_sf', label: 'Subject size (SF)', value: 720, format: 'int' },
        { name: 'comp_sf', label: 'Comp size (SF)', value: 760, format: 'int' },
        { name: 'sf_value', label: 'Value of size ($/SF/month)', value: 1.5, format: 'usd2' },
        { name: 'subject_year', label: 'Subject year built', value: 2026, format: 'general' },
        { name: 'comp_year', label: 'Comp year built', value: 2019, format: 'general' },
        { name: 'year_value', label: 'Value of each year newer ($/month)', value: 15, format: 'usd' },
      ],
      steps: [
        { name: 'size_adj', label: 'Size adjustment', formula: '=(subject_sf-comp_sf)*sf_value', format: 'usd' },
        { name: 'age_adj', label: 'Age adjustment', formula: '=(subject_year-comp_year)*year_value', format: 'usd' },
        { name: 'adjusted', label: 'Adjusted comp rent', formula: '=comp_rent+size_adj+age_adj', format: 'usd' },
        { name: 'net_adj', label: 'Net adjustment as % of comp rent', formula: '=(adjusted-comp_rent)/comp_rent', format: 'pct1' },
      ],
      note: 'A comp needing large net or gross adjustments is a weak comp. Many practitioners distrust a comp once gross adjustments pass roughly a quarter of its rent; treat that as a rule of thumb, not a standard.',
    },
    {
      id: 'mkt-ex-jobs-to-demand',
      title: 'From job growth to apartment demand',
      concept:
        'A simple demand chain: new jobs → new households (jobs / jobs per household) → renter households (x renter share) → demand the subject can capture (x capture rate). Every link is an assumption to source and defend.',
      given: [
        { name: 'new_jobs', label: 'New jobs per year in the market area', value: 6000, format: 'int' },
        { name: 'jobs_per_hh', label: 'Jobs per household', value: 1.4, format: 'num2' },
        { name: 'renter_share', label: 'Share of households that rent', value: 0.48, format: 'pct' },
        { name: 'capture', label: 'Capture rate for the subject', value: 0.03, format: 'pct' },
      ],
      steps: [
        { name: 'households', label: 'New households', formula: '=new_jobs/jobs_per_hh', format: 'int' },
        { name: 'renters', label: 'New renter households', formula: '=households*renter_share', format: 'int' },
        { name: 'subject_demand', label: 'Units the subject can lease per year', formula: '=renters*capture', format: 'num1' },
      ],
    },
    {
      id: 'mkt-ex-affordability',
      title: 'Income needed to afford a rent',
      concept: 'A common screen is that rent should not exceed a stated share of gross income (30% is the usual convention). Required income = annual rent / share.',
      given: [
        { name: 'rent', label: 'Rent per month', value: 2800, format: 'usd' },
        { name: 'share', label: 'Maximum share of income on rent', value: 0.3, format: 'pct' },
        { name: 'median_income', label: 'Area median household income (illustrative)', value: 105000, format: 'usd' },
      ],
      steps: [
        { name: 'required_income', label: 'Income required', formula: '=rent*12/share', format: 'usd' },
        { name: 'vs_median', label: 'Required income as % of the median', formula: '=required_income/median_income', format: 'pct' },
        { name: 'affordable_rent', label: 'Rent the median household can afford', formula: '=median_income*share/12', format: 'usd' },
      ],
    },
    {
      id: 'mkt-ex-capture-rate',
      title: 'Capture and penetration rates',
      concept:
        'Capture rate = the subject’s units / qualified demand. Penetration rate = (subject + competing units) / qualified demand. High rates mean the project needs an unrealistic share of the market.',
      given: [
        { name: 'subject_units', label: 'Subject units', value: 250, format: 'int' },
        { name: 'competing_units', label: 'Competing new units', value: 900, format: 'int' },
        { name: 'qualified', label: 'Income-qualified renter households in the area', value: 9500, format: 'int' },
      ],
      steps: [
        { name: 'capture', label: 'Capture rate', formula: '=subject_units/qualified', format: 'pct1' },
        { name: 'penetration', label: 'Penetration rate', formula: '=(subject_units+competing_units)/qualified', format: 'pct1' },
      ],
    },
    {
      id: 'mkt-ex-sale-comp',
      title: 'Sale comp metrics',
      concept: 'Sale comps are compared on price per unit, price per SF and cap rate (NOI / price). State whether the NOI is trailing or forward and whether taxes are reassessed.',
      given: [
        { name: 'price', label: 'Sale price', value: 42000000, format: 'usd' },
        { name: 'units', label: 'Units', value: 120, format: 'int' },
        { name: 'net_sf', label: 'Net rentable area (SF)', value: 102000, format: 'int' },
        { name: 'noi', label: 'NOI at sale', value: 2100000, format: 'usd' },
      ],
      steps: [
        { name: 'per_unit', label: 'Price per unit', formula: '=price/units', format: 'usd' },
        { name: 'per_sf', label: 'Price per SF', formula: '=price/net_sf', format: 'usd' },
        { name: 'cap', label: 'Cap rate', formula: '=noi/price', format: 'pct2' },
      ],
    },
    {
      id: 'mkt-ex-value-from-comps',
      title: 'Reconciling a value from sale comps',
      concept: 'Apply the concluded cap rate to the subject’s NOI, and cross-check with price per unit. Two methods that disagree by more than about 10% need explaining.',
      given: [
        { name: 'subject_noi', label: 'Subject NOI', value: 1800000, format: 'usd' },
        { name: 'cap', label: 'Concluded cap rate', value: 0.0525, format: 'pct2' },
        { name: 'subject_units', label: 'Subject units', value: 96, format: 'int' },
        { name: 'comp_per_unit', label: 'Concluded price per unit', value: 345000, format: 'usd' },
      ],
      steps: [
        { name: 'by_cap', label: 'Value by cap rate', formula: '=subject_noi/cap', format: 'usd' },
        { name: 'by_unit', label: 'Value by price per unit', formula: '=subject_units*comp_per_unit', format: 'usd' },
        { name: 'gap', label: 'Difference between methods', formula: '=by_cap/by_unit-1', format: 'pct1' },
      ],
    },
    {
      id: 'mkt-ex-lease-up',
      title: 'Lease-up period for a new building',
      concept: 'Months to stabilise = (units at stabilised occupancy - pre-leased units) / units leased per month. Pace comes from comparable lease-ups, not from hope.',
      given: [
        { name: 'units', label: 'Units', value: 250, format: 'int' },
        { name: 'stab_occ', label: 'Stabilised occupancy', value: 0.95, format: 'pct' },
        { name: 'preleased', label: 'Pre-leased at opening', value: 30, format: 'int' },
        { name: 'pace', label: 'Net leases per month', value: 18, format: 'int' },
      ],
      steps: [
        { name: 'stab_units', label: 'Occupied units at stabilisation', formula: '=units*stab_occ', format: 'num1' },
        { name: 'to_lease', label: 'Units still to lease', formula: '=stab_units-preleased', format: 'num1' },
        { name: 'months', label: 'Months to stabilise', formula: '=to_lease/pace', format: 'num1' },
      ],
    },
    {
      id: 'mkt-ex-rent-growth',
      title: 'Compound annual rent growth',
      concept: 'CAGR = (end / start)^(1 / years) - 1. Never divide the total change by the number of years.',
      given: [
        { name: 'rent_then', label: 'Average rent five years ago', value: 2150, format: 'usd' },
        { name: 'rent_now', label: 'Average rent now', value: 2650, format: 'usd' },
        { name: 'years', label: 'Years', value: 5, format: 'int' },
      ],
      steps: [
        { name: 'cagr', label: 'Compound annual growth', formula: '=(rent_now/rent_then)^(1/years)-1', format: 'pct2' },
        { name: 'simple', label: 'TRAP: total change / years', formula: '=(rent_now/rent_then-1)/years', format: 'pct2' },
        { name: 'projected', label: 'Rent in 3 years at the CAGR', formula: '=rent_now*(1+cagr)^3', format: 'usd' },
      ],
    },
    {
      id: 'mkt-ex-pipeline',
      title: 'Pipeline pressure',
      concept: 'Two quick gauges of supply risk: pipeline as a share of inventory, and years of supply = pipeline / annual net absorption.',
      given: [
        { name: 'inventory', label: 'Inventory (units)', value: 8000, format: 'int' },
        { name: 'pipeline', label: 'Under construction (units)', value: 600, format: 'int' },
        { name: 'annual_absorption', label: 'Trailing annual net absorption', value: 480, format: 'int' },
      ],
      steps: [
        { name: 'pipeline_share', label: 'Pipeline as % of inventory', formula: '=pipeline/inventory', format: 'pct1' },
        { name: 'years_of_supply', label: 'Years of supply', formula: '=pipeline/annual_absorption', format: 'num2' },
      ],
    },
  ],
  typeMix: {
    flashcard: 10,
    mcq: 10,
    numeric: 12,
    estimate: 3,
    grid: 12,
    formula: 3,
    errorhunt: 4,
    predict: 3,
    order: 2,
    explain: 3,
    docreview: 4,
    judgment: 3,
    timed: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'market-analysis-rent-comps-grid-adjustments, market-analysis-absorption-numeric-months-to-stabilise' },
    { title: 'Chunk 1', items: 18, scope: 'market-analysis-supply-demand (9) and market-analysis-drivers (9)' },
    { title: 'Chunk 2', items: 19, scope: 'market-analysis-data (8) and market-analysis-rent-comps (11 more)' },
    { title: 'Chunk 3', items: 19, scope: 'market-analysis-sale-comps (9) and market-analysis-absorption (10 more)' },
    { title: 'Chunk 4', items: 12, scope: 'market-analysis-assumptions (11) and the capstone market-analysis-case (1); set status to built' },
  ],
};
