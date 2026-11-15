/**
 * THE CATEGORY REGISTRY.
 *
 * One entry per category. The home screen tiles, their overlays, landing pages,
 * review queues, `npm run category-status` and the tests all read this file,
 * so a new category needs an entry here plus a folder of the same name
 * (src/content/categories/<slug>/) holding BUILD_SPEC.md, examples.ts and its
 * question files. No other code changes.
 *
 * Rules (enforced by tests/categories.test.ts):
 *  - `slug` is lowercase-with-dashes and never changes once questions exist.
 *  - every subtopic id starts with "<slug>-", and subtopic targets add up to `targetItems`.
 *  - a question's id starts with "<slug>-" and its `topic` is one of the subtopic ids.
 *
 * The Excel & Pro Forma category is the original app. Its topics, levels and
 * questions live where they always have (src/content/topics.ts and
 * src/content/items/) and must not be edited as part of category work.
 */

export type Tier = 'CORE' | 'BIG' | 'MEDIUM' | 'SMALL';
export type CategoryStatus = 'planned' | 'in-progress' | 'built';

export interface Subtopic {
  id: string;
  name: string;
  blurb: string;
  /** 1 = Foundations, 2 = Applied, 3 = Case. */
  level: 1 | 2 | 3;
  /** How many questions the full build puts here. */
  target: number;
}

export interface Category {
  slug: string;
  title: string;
  tier: Tier;
  status: CategoryStatus;
  /** Shown in the overlay that opens when a tile is clicked: one or two sentences. */
  summary: string;
  /** Shown in the same overlay: four to six things you will learn. */
  bullets: string[];
  /** Landing page: a short paragraph on what this is and why it matters. */
  description: string;
  /** Landing page: measurable objectives. */
  objectives: string[];
  /** Question count of the full build. (For the core category the built count is used instead.) */
  targetItems: number;
  /** Laws and rules change: every question must carry `verifiedAsOf` + `sourceUrl`, or `noLegalClaim: true`. */
  needsLegalVerification: boolean;
  /** Who should build it. */
  build: { model: string; effort: 'medium' | 'high' };
  /** An SVG path (24 x 24, stroked) for the tile. */
  icon: string;
  subtopics: Subtopic[];
}

export const CORE_CATEGORY = 'excel-proforma';

/** What each tier is called on screen. The tier ids themselves (CORE, BIG, MEDIUM, SMALL) never change. */
export const TIER_LABELS: Record<Tier, string> = { CORE: 'Core', BIG: 'Large', MEDIUM: 'Medium', SMALL: 'Small' };

export const TIER_SCOPE: Record<Tier, string> = {
  CORE: 'The main course: Levels 0 to 5 and three capstones',
  BIG: 'About 70 questions, two difficulty levels, one capstone case',
  MEDIUM: 'About 40 questions, two difficulty levels, one mini-case',
  SMALL: 'About 20 to 25 questions, one level, no case',
};

export const STATUS_LABELS: Record<CategoryStatus, string> = {
  planned: 'Coming soon',
  'in-progress': 'Being built',
  built: 'Ready',
};

export const CATEGORY_LEVELS: Record<number, string> = { 1: 'Foundations', 2: 'Applied', 3: 'Case' };

const FABLE_HIGH = { model: 'Fable 5.2', effort: 'high' } as const;
const OPUS_HIGH = { model: 'Opus 5.5', effort: 'high' } as const;
const OPUS_MEDIUM = { model: 'Opus 5.5', effort: 'medium' } as const;

export const CATEGORIES: Category[] = [
  {
    slug: CORE_CATEGORY,
    title: 'Excel & Pro Forma Modeling',
    tier: 'CORE',
    status: 'built',
    summary:
      'The core of the app: build real estate models in a real spreadsheet grid, from cell references to a full development pro forma, graded formula by formula.',
    bullets: [
      'Excel fundamentals: anchoring, lookups, dates, model hygiene',
      'NOI, cap rates, leverage metrics, loan math and loan sizing',
      'Acquisition pro formas: cash flows, exit value, IRR and equity multiple',
      'Development pro formas: budgets, draws, construction interest, yield on cost',
      'Equity waterfalls, sensitivity tables and summary pages',
      'Three timed capstones graded like a modeling test',
    ],
    description:
      'Everything an internship modeling test asks for, taught by doing: you type formulas into an Excel-style grid and the grader checks values, catches hardcodes and stress-tests your logic.',
    objectives: [
      'Given a blank sheet and assumptions, build a multi-year pro forma with no hardcodes.',
      'Given a finished model, find and fix planted errors.',
      'Given deal terms, size a loan and compute levered returns.',
      'Given a waterfall structure, split cash between GP and LP.',
    ],
    targetItems: 0, // not used: the core category is complete, so its target is whatever is built
    needsLegalVerification: false,
    build: { model: 'Already built', effort: 'high' },
    icon: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
    subtopics: [], // the core category uses src/content/topics.ts
  },
  {
    slug: 'argus',
    title: 'Commercial Leases & ARGUS',
    tier: 'BIG',
    status: 'in-progress',
    summary:
      'How office, retail and industrial-style leases turn into cash flow, tenant by tenant, and how to read the reports that lease-by-lease software produces.',
    bullets: [
      'Read a rent roll and abstract a lease',
      'Model base rent, escalations, free rent, TIs and leasing commissions',
      'Compute recoveries under NNN, gross, modified gross and base-year leases',
      'Blend renewal probability and downtime into market leasing assumptions',
      'Separate general vacancy, credit loss and turnover vacancy',
      'Read ARGUS-style cash flow and valuation reports',
    ],
    description:
      'Commercial property is valued lease by lease. This category rebuilds the logic of lease-by-lease software in your own spreadsheet and in an original simulator, so a cash flow report is something you can audit rather than trust.',
    objectives: [
      'Given a lease abstract, the student can compute base rent, free rent and escalations for any lease year.',
      'Given building expenses and a lease structure, the student can compute the tenant reimbursement.',
      'Given a renewal probability and market assumptions, the student can compute blended downtime, TIs, commissions and rent at rollover.',
      'Given a cash flow report, the student can identify which line a change in an assumption moves and in which direction.',
      'Given a rent roll and market leasing assumptions, the student can build a five-year lease-by-lease cash flow.',
    ],
    targetItems: 70,
    needsLegalVerification: false,
    build: FABLE_HIGH,
    icon: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
    subtopics: [
      { id: 'argus-rentroll', name: 'Rent rolls & lease abstracts', blurb: 'What each column means and how to abstract a lease.', level: 1, target: 8 },
      { id: 'argus-baserent', name: 'Base rent & escalations', blurb: 'Steps, percentage bumps and CPI, by lease year.', level: 1, target: 9 },
      { id: 'argus-recoveries', name: 'Expense recoveries', blurb: 'NNN, gross, modified gross, base-year and expense stops.', level: 1, target: 11 },
      { id: 'argus-concessions', name: 'Free rent, TIs & commissions', blurb: 'What a lease costs the landlord up front.', level: 1, target: 8 },
      { id: 'argus-mla', name: 'Market leasing assumptions', blurb: 'Renewal probability, downtime and blended rollover costs.', level: 2, target: 11 },
      { id: 'argus-vacancy', name: 'Vacancy & credit loss', blurb: 'General vacancy vs. credit loss vs. turnover vacancy.', level: 2, target: 7 },
      { id: 'argus-reports', name: 'Cash flow & valuation reports', blurb: 'Reading the cash flow, PV and resale pages.', level: 2, target: 9 },
      { id: 'argus-simulator', name: 'Lease-by-lease builds', blurb: 'Tenant inputs to a full cash flow in the simulator and the grid.', level: 2, target: 6 },
      { id: 'argus-case', name: 'Capstone case', blurb: 'Underwrite a multi-tenant building from its rent roll.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'plan-reading',
    title: 'Plan Reading & Building Program',
    tier: 'BIG',
    status: 'built',
    summary:
      'Read a set of architectural and civil drawings the way you would a paper plan set, then turn what you see into areas, unit counts and a building program.',
    bullets: [
      'Find your way around a plan set: sheet index, title blocks, callouts',
      'Tell site plans, floor plans, sections, elevations and details apart',
      'Recognise symbols: grid bubbles, section cuts, door swings, fixtures',
      'Measure with architectural and engineering scales',
      'Compute gross, rentable and efficiency; unit mix and parking ratios',
      'Count a plan and feed it into a mini pro forma',
    ],
    description:
      'Developers spend much of their week looking at drawings. This category uses an interactive viewer with original, generated drawings of multifamily, retail, office and mixed-use buildings: you pan, zoom, measure and click on the plan to answer.',
    objectives: [
      'Given a plan set, the student can find a named sheet or follow a callout to the sheet it references.',
      'Given a drawing, the student can identify its type and locate named elements and symbols.',
      'Given a scale, the student can measure a length within 2% and compute an area.',
      'Given a floor plan, the student can compute gross area, rentable area, efficiency, unit mix and average unit size.',
      'Given a plan and a stated requirement, the student can spot a shortfall (parking, egress, unit mix).',
      'Given a plan, the student can take off the quantities a pro forma needs and build it in the grid.',
    ],
    targetItems: 70,
    needsLegalVerification: false,
    build: FABLE_HIGH,
    icon: 'M3 4h18v16H3zM3 12h7M14 4v9M14 17v3',
    subtopics: [
      { id: 'plan-reading-set', name: 'Plan set organisation', blurb: 'Cover sheet, sheet index, discipline prefixes, title blocks, revisions.', level: 1, target: 8 },
      { id: 'plan-reading-types', name: 'Drawing types', blurb: 'Site plan, floor plan, roof plan, section, elevation, detail, RCP.', level: 1, target: 9 },
      { id: 'plan-reading-symbols', name: 'Symbols & annotation', blurb: 'Grid bubbles, markers, tags, door swings, fixtures, property lines.', level: 1, target: 12 },
      { id: 'plan-reading-scale', name: 'Scales & measuring', blurb: 'Architectural and engineering scales; measuring a dimension.', level: 1, target: 9 },
      { id: 'plan-reading-buildings', name: 'Building types & layouts', blurb: 'Multifamily, retail, office, mixed-use podium and wrap, parking.', level: 2, target: 12 },
      { id: 'plan-reading-program', name: 'Building program math', blurb: 'Gross vs. rentable, efficiency, load factor, unit mix, parking.', level: 2, target: 11 },
      { id: 'plan-reading-bridge', name: 'Plan to pro forma', blurb: 'Take off a plan and build the numbers in the grid.', level: 2, target: 8 },
      { id: 'plan-reading-case', name: 'Capstone case', blurb: 'Test-fit a site and hand off a program.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'entitlements',
    title: 'Entitlements & Zoning',
    tier: 'MEDIUM',
    status: 'planned',
    summary:
      'What a site is allowed to become and how long it takes to get permission, with a California and City of San Diego focus.',
    bullets: [
      'Turn zoning rules (FAR, density, height, setbacks, coverage, parking) into buildable capacity',
      'Entitlement vs. permit; discretionary vs. ministerial approval',
      'CEQA in outline, and why it drives timeline risk',
      'State housing laws: Density Bonus, SB 9, SB 35 / SB 423, ADUs',
      'Inclusionary requirements and impact fees',
      'Price entitlement risk: carry costs and probability-weighted outcomes',
    ],
    description:
      'Entitlement is where land value is made or lost. You will compute what zoning allows, learn which approval path a project takes, and put numbers on delay. Every legal rule in this category is checked against official sources when it is built and shows the date it was verified.',
    objectives: [
      'Given a lot and its zoning standards, the student can compute the maximum floor area and unit count and name the binding constraint.',
      'Given a project description, the student can classify the approval as ministerial or discretionary.',
      'Given a project and a state housing law, the student can decide whether the law applies and what it changes.',
      'Given a fee schedule and unit mix, the student can compute impact fees and inclusionary obligations.',
      'Given a timeline, carry costs and outcome probabilities, the student can compute expected entitlement cost and value.',
    ],
    targetItems: 40,
    needsLegalVerification: true,
    build: OPUS_HIGH,
    icon: 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6',
    subtopics: [
      { id: 'entitlements-zoning', name: 'Zoning capacity', blurb: 'Use, FAR, density, height, setbacks, coverage, parking.', level: 1, target: 9 },
      { id: 'entitlements-approvals', name: 'Approvals & permits', blurb: 'Entitlement vs. permit; discretionary vs. ministerial.', level: 1, target: 6 },
      { id: 'entitlements-ceqa', name: 'CEQA', blurb: 'Exemptions, negative declarations, EIRs and timing.', level: 1, target: 5 },
      { id: 'entitlements-state-law', name: 'State housing laws', blurb: 'Density Bonus Law, SB 9, SB 35 / SB 423, ADU law.', level: 2, target: 8 },
      { id: 'entitlements-local', name: 'Inclusionary, fees & San Diego process', blurb: 'Local obligations and how the City processes a project.', level: 2, target: 6 },
      { id: 'entitlements-risk', name: 'Timeline & risk', blurb: 'Carry costs and probability-weighted outcomes.', level: 2, target: 5 },
      { id: 'entitlements-case', name: 'Mini-case', blurb: 'Capacity, path and risk for one site.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'market-analysis',
    title: 'Market Analysis',
    tier: 'BIG',
    status: 'planned',
    summary:
      'Where pro forma assumptions come from: supply, demand, comps and absorption, using San Diego submarkets as illustrative running examples.',
    bullets: [
      'Read supply and demand: inventory, vacancy, deliveries, net absorption',
      'Adjust rent and sale comps to a subject property',
      'Forecast absorption against a construction pipeline',
      'Tie demand to jobs, population and household formation',
      'Know what CoStar, the census / ACS, BLS and broker reports can and cannot tell you',
      'Turn research into defensible rent, vacancy and growth assumptions',
    ],
    description:
      'A model is only as good as its inputs. This category teaches you to build those inputs from evidence, and to say how confident you are in them. All market figures are clearly labelled illustrative.',
    objectives: [
      'Given inventory, vacancy, deliveries and absorption, the student can compute vacancy rates and months of supply.',
      'Given a subject and comparable properties, the student can build an adjustment grid and conclude a rent or price.',
      'Given a pipeline and an absorption rate, the student can estimate a lease-up period and stabilisation date.',
      'Given employment and population data, the student can estimate housing or space demand.',
      'Given a research question, the student can choose the right data source and name its limits.',
      'Given market research, the student can set and defend pro forma rent, vacancy and growth assumptions.',
    ],
    targetItems: 70,
    needsLegalVerification: false,
    build: OPUS_HIGH,
    icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
    subtopics: [
      { id: 'market-analysis-supply-demand', name: 'Supply & demand', blurb: 'Inventory, vacancy, deliveries, net absorption.', level: 1, target: 9 },
      { id: 'market-analysis-drivers', name: 'Demand drivers', blurb: 'Jobs, population, households, income.', level: 1, target: 9 },
      { id: 'market-analysis-data', name: 'Data sources', blurb: 'CoStar, census / ACS, BLS, broker reports.', level: 1, target: 8 },
      { id: 'market-analysis-rent-comps', name: 'Rent comps', blurb: 'Selecting comps and adjusting them to the subject.', level: 2, target: 12 },
      { id: 'market-analysis-sale-comps', name: 'Sale comps', blurb: 'Price per unit and per SF, cap rates, adjustments.', level: 2, target: 9 },
      { id: 'market-analysis-absorption', name: 'Absorption & pipeline', blurb: 'Lease-up pace, months of supply, competing deliveries.', level: 2, target: 11 },
      { id: 'market-analysis-assumptions', name: 'Research to assumptions', blurb: 'Rent, vacancy, growth and exit cap you can defend.', level: 2, target: 11 },
      { id: 'market-analysis-case', name: 'Capstone case', blurb: 'A submarket study that ends in pro forma inputs.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'acquisitions',
    title: 'Acquisitions & Closing',
    tier: 'BIG',
    status: 'planned',
    summary:
      'The life of a deal from first look to closing day: underwriting from real documents, the contract, due diligence and the mechanics of escrow.',
    bullets: [
      'Review an offering memo critically',
      'Underwrite from a T-12 and rent roll: normalise expenses, loss-to-lease, other income',
      'Know the LOI and PSA terms that move risk',
      'Run due diligence and write an investment committee memo',
      'Escrow, title insurance and exceptions (California norms)',
      'Compute prorations and closing costs in Excel',
    ],
    description:
      'Analysts are judged on whether their underwriting survives contact with the documents. You will work from operating statements, rent rolls, contract excerpts and settlement figures, and learn the closing process well enough to follow a deal calendar.',
    objectives: [
      'Given an offering memo, the student can identify claims that need independent support.',
      'Given a T-12 and rent roll, the student can produce a normalised year-one NOI.',
      'Given LOI or PSA terms, the student can say who bears a stated risk and when deposits go hard.',
      'Given a due diligence finding, the student can decide whether to proceed, re-trade or walk.',
      'Given a title report excerpt, the student can separate routine exceptions from ones that need action.',
      'Given a closing date and property data, the student can compute prorations and cash due at closing.',
    ],
    targetItems: 70,
    needsLegalVerification: false,
    build: OPUS_HIGH,
    icon: 'M5 3h14v18H5zM9 12l2 2 4-4',
    subtopics: [
      { id: 'acquisitions-sourcing', name: 'Sourcing & OM review', blurb: 'Where deals come from and how to read an offering memo.', level: 1, target: 8 },
      { id: 'acquisitions-underwriting', name: 'T-12 & rent roll underwriting', blurb: 'Normalising expenses, loss-to-lease, other income.', level: 1, target: 14 },
      { id: 'acquisitions-contracts', name: 'LOI & PSA terms', blurb: 'Price, deposits, contingencies, representations.', level: 1, target: 9 },
      { id: 'acquisitions-diligence', name: 'Due diligence', blurb: 'Physical, financial, legal and environmental review.', level: 2, target: 9 },
      { id: 'acquisitions-ic-memo', name: 'IC memo', blurb: 'Structuring a recommendation and its risks.', level: 2, target: 6 },
      { id: 'acquisitions-escrow-title', name: 'Escrow & title', blurb: 'Escrow in California, title insurance, exceptions.', level: 2, target: 9 },
      { id: 'acquisitions-prorations', name: 'Prorations & closing costs', blurb: 'Rent, taxes, deposits and the settlement statement.', level: 2, target: 10 },
      { id: 'acquisitions-timeline', name: 'Closing timeline & types', blurb: 'The deal calendar; commercial vs. residential closings.', level: 2, target: 4 },
      { id: 'acquisitions-case', name: 'Capstone case', blurb: 'From OM to IC memo to settlement statement.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'capital-markets',
    title: 'Debt & Capital Markets',
    tier: 'MEDIUM',
    status: 'planned',
    summary: 'Who lends on real estate, on what terms, and how a deal is financed from senior loan to common equity.',
    bullets: [
      'Construction, permanent, bridge and agency loans',
      'The capital stack: senior debt, mezzanine, preferred equity, common equity',
      'Floating rates: SOFR, spreads, floors and rate caps',
      'Loan sizing as the lender sees it',
      'Recourse, carve-outs and guarantees',
      'Refinancing: proceeds, timing and tests',
    ],
    description:
      'Debt usually supplies most of the money in a deal and sets many of its rules. This category teaches loan products and terms from the lender’s side of the table, so you can predict what a lender will say before you ask.',
    objectives: [
      'Given a business plan, the student can match it to a loan type and explain why.',
      'Given a capital stack, the student can compute each layer’s share, blended cost and position in a loss.',
      'Given an index path, spread and cap, the student can compute interest cost and cap payments.',
      'Given NOI, value and lender constraints, the student can size a loan and name the binding constraint.',
      'Given loan terms, the student can say what a guarantor is liable for.',
      'Given a stabilised property, the student can compute refinance proceeds and cash out.',
    ],
    targetItems: 40,
    needsLegalVerification: false,
    build: OPUS_MEDIUM,
    icon: 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5',
    subtopics: [
      { id: 'capital-markets-loan-types', name: 'Loan types', blurb: 'Construction, permanent, bridge, agency.', level: 1, target: 8 },
      { id: 'capital-markets-stack', name: 'Capital stack', blurb: 'Senior, mezzanine, preferred equity, common equity.', level: 1, target: 7 },
      { id: 'capital-markets-rates', name: 'SOFR, spreads & caps', blurb: 'Floating-rate mechanics and hedging.', level: 1, target: 7 },
      { id: 'capital-markets-sizing', name: 'Lender sizing', blurb: 'LTV, LTC, DSCR and debt yield from the lender’s view.', level: 2, target: 8 },
      { id: 'capital-markets-recourse', name: 'Recourse & guarantees', blurb: 'Carve-outs, completion and repayment guarantees.', level: 2, target: 4 },
      { id: 'capital-markets-refinance', name: 'Refinancing', blurb: 'Proceeds, prepayment, extension tests.', level: 2, target: 5 },
      { id: 'capital-markets-case', name: 'Mini-case', blurb: 'Finance one deal from construction to permanent loan.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'asset-management',
    title: 'Asset & Portfolio Management',
    tier: 'BIG',
    status: 'planned',
    summary:
      'What happens after closing: running the business plan for one property, and managing risk and return across a portfolio or fund.',
    bullets: [
      'Asset vs. portfolio vs. property management: who decides what',
      'Annual budgets and budget-vs-actual variance analysis',
      'Capex planning and leasing strategy',
      'Hold, sell or refinance decisions',
      'Investor reporting',
      'Fund strategies, diversification, leverage and benchmarks (NCREIF / ODCE concepts)',
    ],
    description:
      'Returns are promised at acquisition and earned in asset management. You will read budgets and variance reports, weigh capital projects, decide when to sell, and step up to the portfolio level where strategy, diversification and fund leverage matter.',
    objectives: [
      'Given a decision, the student can say whether it belongs to the property manager, asset manager or portfolio manager.',
      'Given a budget and actuals, the student can compute variances, label them favourable or unfavourable and explain the cause.',
      'Given a capital project, the student can compute its return on cost and payback.',
      'Given hold and sale projections, the student can compare the IRR of holding with selling today.',
      'Given property-level returns, fees and leverage, the student can compute fund-level net returns.',
      'Given a portfolio, the student can describe its strategy and concentration risks.',
    ],
    targetItems: 70,
    needsLegalVerification: false,
    build: OPUS_HIGH,
    icon: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M9 10h.01M15 10h.01',
    subtopics: [
      { id: 'asset-management-roles', name: 'Who does what', blurb: 'Asset, portfolio and property management compared.', level: 1, target: 7 },
      { id: 'asset-management-budgets', name: 'Budgets & variance', blurb: 'Annual budgets, reforecasts, budget vs. actual.', level: 1, target: 13 },
      { id: 'asset-management-capex', name: 'Capex planning', blurb: 'Reserves, value-add projects, return on cost.', level: 1, target: 8 },
      { id: 'asset-management-leasing', name: 'Leasing strategy', blurb: 'Renewals, rollover exposure, net effective rent.', level: 2, target: 9 },
      { id: 'asset-management-hold-sell', name: 'Hold, sell or refinance', blurb: 'Comparing the options at any point in the hold.', level: 2, target: 10 },
      { id: 'asset-management-reporting', name: 'Investor reporting', blurb: 'What goes in a quarterly report and why.', level: 2, target: 7 },
      { id: 'asset-management-portfolio', name: 'Portfolio & fund strategy', blurb: 'Core to opportunistic; diversification; fund leverage.', level: 2, target: 9 },
      { id: 'asset-management-fund-returns', name: 'Fund returns & benchmarks', blurb: 'Gross vs. net, fund vs. asset, NCREIF / ODCE concepts.', level: 2, target: 6 },
      { id: 'asset-management-case', name: 'Capstone case', blurb: 'A year in the life of one asset inside a fund.', level: 3, target: 1 },
    ],
  },
  {
    slug: 'construction',
    title: 'Construction Cost & Schedule',
    tier: 'SMALL',
    status: 'planned',
    summary: 'How a building is priced, contracted and paid for, and what happens to the budget when the schedule slips.',
    bullets: [
      'Hard vs. soft costs and the stages of a cost estimate',
      'Delivery methods: design-bid-build, design-build, CM at risk',
      'Contract types: GMP, cost-plus, lump sum',
      'Change orders and contingency drawdown',
      'Draw requests and retainage',
      'Schedule basics and the cost of delay',
    ],
    description:
      'You do not need to be a builder to work in development, but you do need to read a budget, a contract summary and a pay application. This short category covers the vocabulary and the arithmetic.',
    objectives: [
      'Given a budget, the student can classify costs as hard or soft and compute cost per SF and per unit.',
      'Given a project situation, the student can choose a delivery method and contract type and justify it.',
      'Given change orders, the student can track contingency and judge whether it is being used too fast.',
      'Given a pay application, the student can compute retainage and the amount due, and spot overbilling.',
      'Given a delay, the student can compute its carry cost.',
    ],
    targetItems: 24,
    needsLegalVerification: false,
    build: OPUS_MEDIUM,
    icon: 'M6 21V4h2l10 4H8M6 8h2M14 6.5V11M4 21h8',
    subtopics: [
      { id: 'construction-costs', name: 'Costs & estimating', blurb: 'Hard vs. soft costs, estimate stages, cost per SF.', level: 1, target: 6 },
      { id: 'construction-delivery', name: 'Delivery & contracts', blurb: 'Delivery methods and contract types.', level: 1, target: 5 },
      { id: 'construction-changes', name: 'Change orders & contingency', blurb: 'Tracking contingency against progress.', level: 1, target: 4 },
      { id: 'construction-draws', name: 'Draws & retainage', blurb: 'Pay applications and what gets held back.', level: 1, target: 5 },
      { id: 'construction-schedule', name: 'Schedule & delay', blurb: 'Critical path in outline and the cost of delay.', level: 1, target: 4 },
    ],
  },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function categoryBySlug(slug: string): Category | undefined {
  return BY_SLUG.get(slug);
}

/** Every subtopic of every non-core category, with the category it belongs to. */
export const CATEGORY_TOPICS: (Subtopic & { category: string })[] = CATEGORIES.flatMap((c) =>
  c.subtopics.map((s) => ({ ...s, category: c.slug })),
);

const TOPIC_BY_ID = new Map(CATEGORY_TOPICS.map((t) => [t.id, t]));

export function categoryTopic(id: string): (Subtopic & { category: string }) | undefined {
  return TOPIC_BY_ID.get(id);
}
