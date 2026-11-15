/** Machine-checked data for plan-reading/BUILD_SPEC.md. After editing, run `npm run sync-specs`. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'plan-ex-arch-scale',
      title: 'Architectural scale',
      concept:
        'An architectural scale is written as inches on paper = one foot, e.g. 1/8" = 1\'-0". Real feet = inches measured x feet per inch, where feet per inch is the reciprocal of the fraction (8 for 1/8", 4 for 1/4").',
      given: [
        { name: 'paper_in', label: 'Measured on paper (inches)', value: 3.25, format: 'num2' },
        { name: 'ft_per_in', label: 'Feet per inch at 1/8" = 1\'-0"', value: 8, format: 'int' },
        { name: 'ft_per_in_quarter', label: 'Feet per inch at 1/4" = 1\'-0"', value: 4, format: 'int' },
      ],
      steps: [
        { name: 'real_ft', label: 'Real length at 1/8" scale (ft)', formula: '=paper_in*ft_per_in', format: 'num1' },
        { name: 'real_ft_quarter', label: 'Same measurement on a 1/4" drawing (ft)', formula: '=paper_in*ft_per_in_quarter', format: 'num1' },
      ],
      note: 'A larger fraction is a larger-scale (more zoomed-in) drawing, so the same paper length is a shorter real distance.',
    },
    {
      id: 'plan-ex-eng-scale',
      title: 'Engineering (civil) scale',
      concept:
        'Civil drawings use an engineering scale: 1" = 20\', 1" = 40\' and so on. Real feet = inches x the scale number. Areas scale with the square.',
      given: [
        { name: 'width_in', label: 'Lot width on paper (inches)', value: 4.5, format: 'num2' },
        { name: 'depth_in', label: 'Lot depth on paper (inches)', value: 6, format: 'num2' },
        { name: 'scale', label: 'Scale: 1" = this many feet', value: 20, format: 'int' },
      ],
      steps: [
        { name: 'width_ft', label: 'Lot width (ft)', formula: '=width_in*scale', format: 'int' },
        { name: 'depth_ft', label: 'Lot depth (ft)', formula: '=depth_in*scale', format: 'int' },
        { name: 'lot_sf', label: 'Lot area (SF)', formula: '=width_ft*depth_ft', format: 'int' },
        { name: 'acres', label: 'Lot area (acres)', formula: '=lot_sf/43560', format: 'num2' },
        { name: 'wrong_area', label: 'TRAP: scaling the paper area once', formula: '=width_in*depth_in*scale', format: 'int' },
      ],
    },
    {
      id: 'plan-ex-efficiency',
      title: 'Floor efficiency from dimension strings',
      concept:
        'Efficiency = rentable (or net) area / gross floor area. On the generated apartment floor (plan set mf-double-loaded, default parameters) only the units are rentable; corridor, stairs and the core bay are not.',
      given: [
        { name: 'bays', label: 'Bays on the north side', value: 5, format: 'int' },
        { name: 'unit_width', label: 'Bay width (ft)', value: 26, format: 'int' },
        { name: 'unit_depth', label: 'Unit depth (ft)', value: 30, format: 'int' },
        { name: 'corridor_width', label: 'Corridor width (ft)', value: 6, format: 'int' },
        { name: 'stair_width', label: 'Stair width (ft)', value: 10, format: 'int' },
      ],
      steps: [
        { name: 'building_length', label: 'Overall length (ft)', formula: '=2*stair_width+bays*unit_width', format: 'int' },
        { name: 'building_depth', label: 'Overall depth (ft)', formula: '=2*unit_depth+corridor_width', format: 'int' },
        { name: 'floor_gsf', label: 'Gross floor area (SF)', formula: '=building_length*building_depth', format: 'int' },
        { name: 'one_bed_count', label: 'One-bed units', formula: '=2*bays-3', format: 'int' },
        { name: 'one_bed_sf', label: 'One-bed area (SF)', formula: '=unit_width*unit_depth', format: 'int' },
        { name: 'two_bed_sf', label: 'Two-bed area (SF)', formula: '=(stair_width+unit_width)*unit_depth', format: 'int' },
        { name: 'rentable_sf', label: 'Rentable area (SF)', formula: '=one_bed_count*one_bed_sf+2*two_bed_sf', format: 'int' },
        { name: 'efficiency', label: 'Efficiency', formula: '=rentable_sf/floor_gsf', format: 'pct1' },
      ],
      note: 'tests/plans.test.ts checks these same numbers against the generator’s facts and against the areas of the drawn rooms.',
    },
    {
      id: 'plan-ex-unit-mix',
      title: 'Unit mix and average unit size',
      concept: 'Unit mix is each type’s share of the unit count. Average unit size is total net area / unit count, a weighted average, never the average of the type sizes.',
      given: [
        { name: 'one_beds', label: 'One-bed units', value: 7, format: 'int' },
        { name: 'one_bed_sf', label: 'One-bed size (SF)', value: 780, format: 'int' },
        { name: 'two_beds', label: 'Two-bed units', value: 2, format: 'int' },
        { name: 'two_bed_sf', label: 'Two-bed size (SF)', value: 1080, format: 'int' },
      ],
      steps: [
        { name: 'units', label: 'Units', formula: '=one_beds+two_beds', format: 'int' },
        { name: 'one_bed_share', label: 'One-bed share of the mix', formula: '=one_beds/units', format: 'pct1' },
        { name: 'avg_sf', label: 'Average unit size (SF)', formula: '=(one_beds*one_bed_sf+two_beds*two_bed_sf)/units', format: 'num1' },
        { name: 'wrong_avg', label: 'TRAP: simple average of the two sizes', formula: '=(one_bed_sf+two_bed_sf)/2', format: 'num1' },
      ],
    },
    {
      id: 'plan-ex-load-factor',
      title: 'Load factor (office)',
      concept:
        'On a multi-tenant office floor, each tenant’s rentable area is its usable area plus a share of the floor’s common area. Load factor = floor rentable / floor usable. Tenant rentable = tenant usable x load factor. (BOMA publishes the measurement standards; this is the basic idea only.)',
      given: [
        { name: 'floor_rentable', label: 'Floor rentable area (SF)', value: 20000, format: 'int' },
        { name: 'floor_usable', label: 'Floor usable area (SF)', value: 17000, format: 'int' },
        { name: 'tenant_usable', label: 'Tenant usable area (SF)', value: 5000, format: 'int' },
      ],
      steps: [
        { name: 'load_factor', label: 'Load factor', formula: '=floor_rentable/floor_usable', format: 'num2' },
        { name: 'tenant_rentable', label: 'Tenant rentable area (SF)', formula: '=tenant_usable*load_factor', format: 'int' },
        { name: 'add_on', label: 'Add-on (common area) share', formula: '=load_factor-1', format: 'pct1' },
      ],
    },
    {
      id: 'plan-ex-parking-layout',
      title: 'Counting stalls from a parking layout',
      concept:
        'A double-loaded parking module is two rows of stalls sharing one drive aisle: module width = 2 x stall depth + aisle. Stalls per row = row length / stall width, rounded down.',
      given: [
        { name: 'stall_width', label: 'Stall width (ft)', value: 9, format: 'num1' },
        { name: 'stall_depth', label: 'Stall depth (ft)', value: 18, format: 'num1' },
        { name: 'aisle', label: 'Drive aisle (ft)', value: 24, format: 'num1' },
        { name: 'row_length', label: 'Row length available (ft)', value: 185, format: 'int' },
        { name: 'garage_width', label: 'Garage width (ft)', value: 125, format: 'int' },
      ],
      steps: [
        { name: 'module_width', label: 'Module width (ft)', formula: '=2*stall_depth+aisle', format: 'num1' },
        { name: 'modules', label: 'Modules that fit', formula: '=ROUNDDOWN(garage_width/module_width,0)', format: 'int' },
        { name: 'stalls_per_row', label: 'Stalls per row', formula: '=ROUNDDOWN(row_length/stall_width,0)', format: 'int' },
        { name: 'stalls', label: 'Stalls', formula: '=modules*2*stalls_per_row', format: 'int' },
      ],
      note: 'Stall and aisle sizes here are illustrative. Real minimums come from the local code and belong to the Entitlements category.',
    },
    {
      id: 'plan-ex-parking-ratio',
      title: 'Parking ratio and shortfall',
      concept: 'Required stalls = units x required ratio, rounded up. A plan with fewer stalls has a shortfall. The required ratio is GIVEN in every question in this category.',
      given: [
        { name: 'units', label: 'Units', value: 96, format: 'int' },
        { name: 'required_ratio', label: 'Required stalls per unit (given)', value: 1.25, format: 'num2' },
        { name: 'provided', label: 'Stalls counted on the plan', value: 110, format: 'int' },
      ],
      steps: [
        { name: 'required', label: 'Stalls required', formula: '=ROUNDUP(units*required_ratio,0)', format: 'int' },
        { name: 'shortfall', label: 'Shortfall', formula: '=MAX(0,required-provided)', format: 'int' },
        { name: 'provided_ratio', label: 'Ratio provided', formula: '=provided/units', format: 'num2' },
      ],
    },
    {
      id: 'plan-ex-retail-bay',
      title: 'Retail bay: frontage and depth',
      concept: 'Shop space is described by frontage (width along the storefront) and depth. Area = frontage x depth. Shallow, wide bays are worth more per SF than deep, narrow ones because frontage sells.',
      given: [
        { name: 'frontage', label: 'Frontage (ft)', value: 25, format: 'int' },
        { name: 'depth', label: 'Depth (ft)', value: 60, format: 'int' },
        { name: 'strip_length', label: 'Length of the retail strip (ft)', value: 210, format: 'int' },
      ],
      steps: [
        { name: 'bay_sf', label: 'Bay area (SF)', formula: '=frontage*depth', format: 'int' },
        { name: 'bays', label: 'Whole bays in the strip', formula: '=ROUNDDOWN(strip_length/frontage,0)', format: 'int' },
        { name: 'ratio', label: 'Depth-to-frontage ratio', formula: '=depth/frontage', format: 'num1' },
      ],
    },
    {
      id: 'plan-ex-office-plate',
      title: 'Office floor plate: core and lease depth',
      concept: 'Lease depth is the distance from the core to the window wall. With a central core, lease depth = (plate depth - core depth) / 2. Floor efficiency = (plate - core) / plate.',
      given: [
        { name: 'plate_length', label: 'Floor plate length (ft)', value: 200, format: 'int' },
        { name: 'plate_depth', label: 'Floor plate depth (ft)', value: 120, format: 'int' },
        { name: 'core_length', label: 'Core length (ft)', value: 60, format: 'int' },
        { name: 'core_depth', label: 'Core depth (ft)', value: 30, format: 'int' },
      ],
      steps: [
        { name: 'plate_sf', label: 'Floor plate (SF)', formula: '=plate_length*plate_depth', format: 'int' },
        { name: 'core_sf', label: 'Core (SF)', formula: '=core_length*core_depth', format: 'int' },
        { name: 'lease_depth', label: 'Lease depth (ft)', formula: '=(plate_depth-core_depth)/2', format: 'num1' },
        { name: 'efficiency', label: 'Floor efficiency', formula: '=(plate_sf-core_sf)/plate_sf', format: 'pct1' },
      ],
    },
    {
      id: 'plan-ex-test-fit',
      title: 'Test fit: applying given zoning numbers to a floor plate',
      concept:
        'A test fit asks how much of an allowed envelope a real floor plate uses. The zoning numbers are GIVEN (this category applies them; Entitlements teaches them). Floors = allowed floor area / plate, rounded down, capped by the height limit.',
      given: [
        { name: 'lot_sf', label: 'Lot area (SF)', value: 20000, format: 'int' },
        { name: 'far', label: 'FAR (given)', value: 2, format: 'num2' },
        { name: 'max_storeys', label: 'Storeys allowed by height (given)', value: 5, format: 'int' },
        { name: 'plate_sf', label: 'Floor plate from the plan (SF)', value: 9900, format: 'int' },
        { name: 'units_per_floor', label: 'Units per floor, counted on the plan', value: 9, format: 'int' },
      ],
      steps: [
        { name: 'allowed_sf', label: 'Floor area allowed', formula: '=lot_sf*far', format: 'int' },
        { name: 'floors', label: 'Floors that fit', formula: '=MIN(max_storeys,ROUNDDOWN(allowed_sf/plate_sf,0))', format: 'int' },
        { name: 'units', label: 'Units', formula: '=floors*units_per_floor', format: 'int' },
        { name: 'far_used', label: 'FAR used', formula: '=floors*plate_sf/lot_sf', format: 'num2' },
      ],
    },
    {
      id: 'plan-ex-bridge',
      title: 'Bridge to Excel: from a counted plan to a mini pro forma',
      concept:
        'The quantities taken off a plan (units by type, net area) are the first inputs of a pro forma. Counting wrong moves every number below.',
      given: [
        { name: 'floors', label: 'Residential floors', value: 4, format: 'int' },
        { name: 'one_beds', label: 'One-beds per floor (counted)', value: 7, format: 'int' },
        { name: 'two_beds', label: 'Two-beds per floor (counted)', value: 2, format: 'int' },
        { name: 'rent_one', label: 'One-bed rent per month (illustrative)', value: 2650, format: 'usd' },
        { name: 'rent_two', label: 'Two-bed rent per month (illustrative)', value: 3450, format: 'usd' },
        { name: 'vacancy', label: 'Vacancy', value: 0.05, format: 'pct' },
        { name: 'expense_ratio', label: 'Operating expense ratio', value: 0.35, format: 'pct' },
        { name: 'cap', label: 'Cap rate', value: 0.0525, format: 'pct2' },
      ],
      steps: [
        { name: 'units', label: 'Units', formula: '=floors*(one_beds+two_beds)', format: 'int' },
        { name: 'gpr', label: 'Gross potential rent', formula: '=floors*(one_beds*rent_one+two_beds*rent_two)*12', format: 'usd' },
        { name: 'egi', label: 'Effective gross income', formula: '=gpr*(1-vacancy)', format: 'usd' },
        { name: 'noi', label: 'NOI', formula: '=egi*(1-expense_ratio)', format: 'usd' },
        { name: 'value', label: 'Value', formula: '=noi/cap', format: 'usd' },
        { name: 'value_per_unit', label: 'Value per unit', formula: '=value/units', format: 'usd' },
      ],
    },
  ],
  typeMix: {
    plan: 34,
    flashcard: 8,
    mcq: 6,
    numeric: 6,
    order: 2,
    explain: 1,
    grid: 6,
    errorhunt: 2,
    docreview: 2,
    judgment: 2,
    timed: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'plan-reading-symbols-locate-stair, plan-reading-program-measure-efficiency, and the minimal viewer with plan set mf-double-loaded' },
    { title: 'Chunk 1 (done 2026-11-15)', items: 19, scope: 'Viewer extensions V1 to V4 (section 13.3), sheets C-101 site plan and A-301 building section; plan-reading-set (8) and plan-reading-symbols (11 more)' },
    { title: 'Chunk 2 (done 2026-11-15)', items: 18, scope: 'Sheets A-103 roof plan, A-201 south elevation and A-402 unit reflected ceiling plan, with an elevation marker on the floor plan; plan-reading-types (9) and plan-reading-scale (9)' },
    { title: 'Chunk 3 (done 2026-11-15)', items: 12, scope: 'New plan sets retail-strip, office-floor and podium-mixed-use (parking level and section); plan-reading-buildings (12)' },
    { title: 'Chunk 4', items: 18, scope: 'Takeoff attachment for grid questions (section 13.4); plan-reading-program (10 more) and plan-reading-bridge (8)' },
    { title: 'Chunk 5', items: 1, scope: 'Capstone plan-reading-case; accessibility pass; set status to built' },
  ],
};
