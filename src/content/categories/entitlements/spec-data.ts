/**
 * Machine-checked data for entitlements/BUILD_SPEC.md. After editing, run `npm run sync-specs`.
 *
 * Every standard, percentage and fee below is HYPOTHETICAL: invented to show the arithmetic.
 * None is a statement of current law. The builder replaces them with verified figures (section 11 of the spec).
 */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'ent-ex-capacity',
      title: 'Buildable floor area: FAR vs. height and coverage',
      concept:
        'Floor area ratio (FAR) = total floor area / lot area. Height and lot coverage form a second, independent limit: storeys x footprint. The smaller result governs.',
      given: [
        { name: 'lot_sf', label: 'Lot area (SF)', value: 20000, format: 'int' },
        { name: 'far', label: 'Maximum FAR (hypothetical)', value: 2, format: 'num2' },
        { name: 'height_limit', label: 'Height limit, ft (hypothetical)', value: 50, format: 'int' },
        { name: 'floor_to_floor', label: 'Floor-to-floor height (ft)', value: 10, format: 'num1' },
        { name: 'coverage', label: 'Maximum lot coverage (hypothetical)', value: 0.6, format: 'pct' },
      ],
      steps: [
        { name: 'by_far', label: 'Floor area allowed by FAR', formula: '=lot_sf*far', format: 'int' },
        { name: 'storeys', label: 'Storeys under the height limit', formula: '=ROUNDDOWN(height_limit/floor_to_floor,0)', format: 'int' },
        { name: 'footprint', label: 'Footprint allowed by coverage', formula: '=lot_sf*coverage', format: 'int' },
        { name: 'by_envelope', label: 'Floor area allowed by height and coverage', formula: '=storeys*footprint', format: 'int' },
        { name: 'buildable', label: 'Buildable floor area', formula: '=MIN(by_far,by_envelope)', format: 'int' },
      ],
      note: 'Here FAR binds (40,000 SF against 60,000 SF). A height increase would add nothing; a FAR increase would.',
    },
    {
      id: 'ent-ex-density',
      title: 'Density in dwelling units per acre',
      concept: 'Density limits are written either as lot area per unit or as dwelling units per acre (du/ac). 1 acre = 43,560 SF. How fractions are rounded depends on the code and on any state law that applies: verify, never assume.',
      given: [
        { name: 'lot_sf', label: 'Lot area (SF)', value: 32670, format: 'int' },
        { name: 'du_per_acre', label: 'Density, du/ac (hypothetical)', value: 29, format: 'int' },
      ],
      steps: [
        { name: 'acres', label: 'Lot area (acres)', formula: '=lot_sf/43560', format: 'num2' },
        { name: 'raw_units', label: 'Units before rounding', formula: '=acres*du_per_acre', format: 'num2' },
        { name: 'units_down', label: 'If the code rounds down', formula: '=ROUNDDOWN(raw_units,0)', format: 'int' },
        { name: 'units_up', label: 'If the rule rounds up', formula: '=ROUNDUP(raw_units,0)', format: 'int' },
        { name: 'sf_per_unit', label: 'Equivalent lot SF per unit', formula: '=43560/du_per_acre', format: 'int' },
      ],
    },
    {
      id: 'ent-ex-setbacks',
      title: 'Setbacks and the buildable footprint',
      concept: 'Setbacks are minimum distances from the property lines. The buildable footprint is what remains, and it is then also subject to lot coverage.',
      given: [
        { name: 'lot_width', label: 'Lot width (ft)', value: 100, format: 'int' },
        { name: 'lot_depth', label: 'Lot depth (ft)', value: 200, format: 'int' },
        { name: 'front', label: 'Front setback, ft (hypothetical)', value: 15, format: 'int' },
        { name: 'rear', label: 'Rear setback, ft (hypothetical)', value: 10, format: 'int' },
        { name: 'side', label: 'Each side setback, ft (hypothetical)', value: 5, format: 'int' },
        { name: 'coverage', label: 'Maximum lot coverage (hypothetical)', value: 0.6, format: 'pct' },
      ],
      steps: [
        { name: 'pad_width', label: 'Buildable width (ft)', formula: '=lot_width-2*side', format: 'int' },
        { name: 'pad_depth', label: 'Buildable depth (ft)', formula: '=lot_depth-front-rear', format: 'int' },
        { name: 'pad_sf', label: 'Footprint inside setbacks (SF)', formula: '=pad_width*pad_depth', format: 'int' },
        { name: 'coverage_sf', label: 'Footprint allowed by coverage (SF)', formula: '=lot_width*lot_depth*coverage', format: 'int' },
        { name: 'footprint', label: 'Maximum footprint (SF)', formula: '=MIN(pad_sf,coverage_sf)', format: 'int' },
      ],
    },
    {
      id: 'ent-ex-parking',
      title: 'Required parking',
      concept: 'Required stalls = sum over unit types of units x ratio, then rounded as the code says. Ratios here are hypothetical. State or local law may reduce or remove minimums in some locations: verify per project.',
      given: [
        { name: 'one_beds', label: 'One-bed units', value: 28, format: 'int' },
        { name: 'two_beds', label: 'Two-bed units', value: 8, format: 'int' },
        { name: 'ratio_one', label: 'Stalls per one-bed (hypothetical)', value: 1, format: 'num2' },
        { name: 'ratio_two', label: 'Stalls per two-bed (hypothetical)', value: 1.75, format: 'num2' },
      ],
      steps: [
        { name: 'raw', label: 'Stalls before rounding', formula: '=one_beds*ratio_one+two_beds*ratio_two', format: 'num2' },
        { name: 'required', label: 'Stalls required (rounded up)', formula: '=ROUNDUP(raw,0)', format: 'int' },
      ],
    },
    {
      id: 'ent-ex-density-bonus',
      title: 'Density bonus arithmetic (placeholder percentages)',
      concept:
        'A density bonus lets a project exceed base density in exchange for affordable homes. The arithmetic is always: affordable units = set-aside % x BASE units; bonus units = bonus % x BASE units; total = base + bonus. The percentages, the income levels and the rounding rules come from the statute and MUST be looked up at build time. The figures below are placeholders.',
      given: [
        { name: 'base_units', label: 'Base density (units)', value: 40, format: 'int' },
        { name: 'set_aside', label: 'Affordable set-aside, % of base (PLACEHOLDER)', value: 0.1, format: 'pct' },
        { name: 'bonus_pct', label: 'Bonus earned, % of base (PLACEHOLDER)', value: 0.2, format: 'pct' },
      ],
      steps: [
        { name: 'affordable', label: 'Affordable units', formula: '=ROUNDUP(base_units*set_aside,0)', format: 'int' },
        { name: 'bonus_units', label: 'Bonus units', formula: '=ROUNDUP(base_units*bonus_pct,0)', format: 'int' },
        { name: 'total_units', label: 'Total units', formula: '=base_units+bonus_units', format: 'int' },
        { name: 'market_units', label: 'Market-rate units', formula: '=total_units-affordable', format: 'int' },
        { name: 'affordable_share', label: 'Affordable share of the total', formula: '=affordable/total_units', format: 'pct1' },
      ],
      note: 'The set-aside is measured on the BASE units, not the total. Applying it to the total is the most common error and makes a good distractor. Whether fractions round up must be verified in the statute.',
    },
    {
      id: 'ent-ex-inclusionary',
      title: 'Inclusionary: build on site or pay the in-lieu fee',
      concept:
        'Local inclusionary rules typically offer a choice: provide a share of units as affordable, or pay a fee (often per SF of residential area). Compare the fee with the value given up by restricting units. All figures are hypothetical.',
      given: [
        { name: 'units', label: 'Units', value: 60, format: 'int' },
        { name: 'net_sf', label: 'Net residential area (SF)', value: 48000, format: 'int' },
        { name: 'onsite_pct', label: 'On-site requirement (hypothetical)', value: 0.1, format: 'pct' },
        { name: 'fee_psf', label: 'In-lieu fee, $/SF (hypothetical)', value: 25, format: 'usd2' },
        { name: 'market_value', label: 'Value of a market-rate unit', value: 520000, format: 'usd' },
        { name: 'restricted_value', label: 'Value of the same unit, rent-restricted', value: 260000, format: 'usd' },
      ],
      steps: [
        { name: 'onsite_units', label: 'Affordable units if built on site', formula: '=ROUNDUP(units*onsite_pct,0)', format: 'int' },
        { name: 'onsite_cost', label: 'Value given up on site', formula: '=onsite_units*(market_value-restricted_value)', format: 'usd' },
        { name: 'fee', label: 'In-lieu fee', formula: '=net_sf*fee_psf', format: 'usd' },
        { name: 'cheaper_by', label: 'Fee is cheaper by', formula: '=onsite_cost-fee', format: 'usd' },
      ],
      note: 'On-site units may also unlock a density bonus or a faster approval path, which the fee does not. The cheaper line is not automatically the better choice.',
    },
    {
      id: 'ent-ex-impact-fees',
      title: 'Impact fees',
      concept: 'Impact fees are charged per unit, per SF or both, and are due at a stated milestone (often building permit or final inspection). Fee schedules change every year: always quote the schedule date.',
      given: [
        { name: 'units', label: 'Units', value: 60, format: 'int' },
        { name: 'gsf', label: 'Gross floor area (SF)', value: 62000, format: 'int' },
        { name: 'fee_per_unit', label: 'Per-unit fees (hypothetical)', value: 14500, format: 'usd' },
        { name: 'fee_psf', label: 'Per-SF fees (hypothetical)', value: 6.4, format: 'usd2' },
      ],
      steps: [
        { name: 'unit_fees', label: 'Per-unit fees', formula: '=units*fee_per_unit', format: 'usd' },
        { name: 'sf_fees', label: 'Per-SF fees', formula: '=gsf*fee_psf', format: 'usd' },
        { name: 'total_fees', label: 'Total fees', formula: '=unit_fees+sf_fees', format: 'usd' },
        { name: 'per_unit', label: 'All-in fees per unit', formula: '=total_fees/units', format: 'usd' },
      ],
    },
    {
      id: 'ent-ex-expected-carry',
      title: 'Expected carry cost with a risk of delay',
      concept: 'Expected months = base months + probability of delay x extra months. Expected cost = expected months x monthly carry. Always show the bad case too.',
      given: [
        { name: 'carry', label: 'Carry cost per month', value: 60000, format: 'usd' },
        { name: 'base_months', label: 'Base entitlement period (months)', value: 14, format: 'int' },
        { name: 'prob', label: 'Probability of an appeal', value: 0.3, format: 'pct' },
        { name: 'extra', label: 'Extra months if appealed', value: 8, format: 'int' },
      ],
      steps: [
        { name: 'expected_months', label: 'Expected months', formula: '=base_months+prob*extra', format: 'num1' },
        { name: 'expected_cost', label: 'Expected carry cost', formula: '=carry*expected_months', format: 'usd' },
        { name: 'bad_case', label: 'Carry cost if the appeal happens', formula: '=carry*(base_months+extra)', format: 'usd' },
      ],
    },
    {
      id: 'ent-ex-probability-weighted-land',
      title: 'Probability-weighted land value',
      concept:
        'Unentitled land is worth the probability-weighted value of its outcomes, less the cost of getting there. A buyer who pays the entitled value for unentitled land is taking the approval risk for free.',
      given: [
        { name: 'value_approved', label: 'Land value if approved', value: 12000000, format: 'usd' },
        { name: 'value_denied', label: 'Land value if denied (existing zoning)', value: 6500000, format: 'usd' },
        { name: 'prob', label: 'Probability of approval', value: 0.7, format: 'pct' },
        { name: 'pursuit', label: 'Entitlement and carry costs', value: 1400000, format: 'usd' },
      ],
      steps: [
        { name: 'expected_value', label: 'Probability-weighted value', formula: '=prob*value_approved+(1-prob)*value_denied', format: 'usd' },
        { name: 'max_price', label: 'Most to pay today (before any return)', formula: '=expected_value-pursuit', format: 'usd' },
        { name: 'discount', label: 'Discount to entitled value', formula: '=1-max_price/value_approved', format: 'pct1' },
      ],
    },
    {
      id: 'ent-ex-time-value',
      title: 'What a delay costs in present value',
      concept: 'A delay costs carry AND pushes the payoff later. Present value of the entitled land value = value / (1 + rate)^(months / 12).',
      given: [
        { name: 'value_approved', label: 'Land value when entitled', value: 12000000, format: 'usd' },
        { name: 'rate', label: 'Annual discount rate', value: 0.15, format: 'pct' },
        { name: 'months', label: 'Base case (months)', value: 14, format: 'int' },
        { name: 'delay', label: 'Delay (months)', value: 8, format: 'int' },
      ],
      steps: [
        { name: 'pv_base', label: 'PV, base case', formula: '=value_approved/(1+rate)^(months/12)', format: 'usd' },
        { name: 'pv_delayed', label: 'PV, with the delay', formula: '=value_approved/(1+rate)^((months+delay)/12)', format: 'usd' },
        { name: 'loss', label: 'Value lost to the delay (before carry)', formula: '=pv_base-pv_delayed', format: 'usd' },
      ],
    },
  ],
  typeMix: {
    flashcard: 6,
    mcq: 8,
    numeric: 6,
    grid: 6,
    errorhunt: 2,
    order: 2,
    explain: 2,
    judgment: 4,
    docreview: 2,
    gonogo: 1,
    case: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'entitlements-zoning-grid-capacity, entitlements-risk-numeric-expected-carry (both noLegalClaim)' },
    { title: 'Chunk 1', items: 19, scope: 'Verification log first (section 11); then entitlements-zoning (8 more), entitlements-approvals (6), entitlements-ceqa (5)' },
    { title: 'Chunk 2', items: 19, scope: 'Verification log update; entitlements-state-law (8), entitlements-local (6), entitlements-risk (4 more), mini-case entitlements-case (1); set status to built' },
  ],
};
