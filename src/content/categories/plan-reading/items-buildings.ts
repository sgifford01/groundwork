/**
 * Plan Reading: reading building types (subtopic plan-reading-buildings).
 * Uses the retail-strip, office-floor and podium-mixed-use plan sets.
 */
import { categoryItems } from '../define';

const RETAIL: Record<string, number>[] = [{ bays: 6 }, { bays: 5, bay_width: 24, shop_depth: 70 }, { bays: 7, bay_width: 22, service_width: 10 }];
const OFFICE: Record<string, number>[] = [{ bays: 7 }, { bays: 6, lease_depth: 42 }, { bays: 8, column_spacing: 28, core_depth: 28 }];
const GARAGE: Record<string, number>[] = [{ stalls_per_row: 16 }, { stalls_per_row: 12 }, { stalls_per_row: 18, stall_width: 8.5 }];
const SECTION: Record<string, number>[] = [{ res_storeys: 4 }, { res_storeys: 3 }, { res_storeys: 5, retail_height: 20 }];

export const ITEMS = categoryItems('plan-reading', [
  // ---------------------------------------------------------------- retail
  {
    id: 'plan-reading-buildings-locate-retail-loading',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Where do deliveries arrive?',
    prompt: 'This is the ground floor of a row of shops. A truck arrives with stock for one of the tenants. Click where it unloads.',
    tags: ['retail', 'loading', 'back of house'],
    estMinutes: 1,
    hints: [
      'Shops are designed so deliveries never cross the sales floor.',
      'Look at the strip behind the shops, on the side away from the street.',
      'Read the general note: where is the alley? Find the end of the strip where the exterior wall is open to it.',
    ],
    plan: { set: 'retail-strip', variants: RETAIL, sheet: 'A-101' },
    task: {
      kind: 'locate',
      targets: ['loading'],
      decoys: [
        { match: 'service-corridor', why: 'Close: stock travels along the service corridor to each shop’s rear door. But the truck unloads at the loading bay at the west end, where the wall opens to the alley.', category: 'concept' },
        { match: 'storefront', why: 'The storefront is for customers. Deliveries come in at the back, through the loading bay, so the sales floor stays clear.', category: 'concept' },
        { match: 'sidewalk', why: 'Unloading on the street side would block customers and the sidewalk. Retail is planned so deliveries arrive at the back, at the loading bay.', category: 'concept' },
        { match: 'trash', why: 'That is the trash room. Deliveries arrive at the loading bay at the other end of the service corridor.', category: 'concept' },
      ],
    },
    explanation:
      'Retail needs a front and a back. Customers come in through the storefronts on the street; deliveries arrive at the loading bay, move along the {service_width}-ft service corridor and reach each shop through its rear door. A shop with no back-of-house access is much harder to lease to a food or grocery tenant.',
  },
  {
    id: 'plan-reading-buildings-measure-retail-leasable',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Leasable area of a row of shops',
    prompt:
      'Landlords lease the shops, not the service strip behind them. Using the dimension strings on this ground floor, what is the total area of the shops?',
    tags: ['retail', 'leasable area', 'efficiency', 'dimension strings'],
    estMinutes: 3,
    hints: [
      'The depth dimensions on the left are split into the service strip and the shop depth.',
      'Every shop is as deep as every other. The corner shop is wider, not deeper.',
      'Total shop area = overall building length x shop depth.',
    ],
    plan: { set: 'retail-strip', variants: RETAIL, sheet: 'A-101' },
    task: {
      kind: 'measure',
      answer: '=leasable_sf',
      format: 'int',
      unit: 'SF',
      tool: 'real',
      mistakes: [
        { formula: '=gross_sf', label: 'That includes the service strip behind the shops. Every tenant shares it and nobody leases it.', category: 'wrong-base' },
        { formula: '=tenant_count*inline_sf', label: 'Not every shop is the same size. The corner suite takes two bays, so count bays, not tenants.', category: 'concept' },
        { formula: '=inline_sf', label: 'That is one shop. The question asks for all of them together.', category: 'omitted' },
      ],
    },
    explanation:
      'The shops run the full {building_length} ft length of the building and are {shop_depth} ft deep: {leasable_sf|int} SF. The {service_width}-ft service strip ({service_sf|int} SF) is back-of-house space, so the floor is {=leasable_sf/gross_sf|pct1} efficient.',
  },

  // ---------------------------------------------------------------- office
  {
    id: 'plan-reading-buildings-locate-lease-depth',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Find the lease depth',
    prompt:
      'In an office building, "lease depth" is the distance from the core to the window wall: how far a tenant’s space reaches from the corridor to the glass. Click a dimension string that gives it.',
    tags: ['office', 'lease depth', 'core', 'dimension strings'],
    estMinutes: 1,
    hints: [
      'The core is the block in the middle with the stairs and elevators.',
      'Look at the stack of dimensions down the left side of the plan.',
      'There are three pieces: window to core, the core itself, core to window.',
    ],
    plan: { set: 'office-floor', variants: OFFICE, sheet: 'A-104' },
    task: {
      kind: 'locate',
      targets: ['dim-lease-north', 'dim-lease-south'],
      decoys: [
        { match: 'dim-core-depth', why: 'That measures the core itself. Lease depth is the piece between the core and the window wall, above or below it.', category: 'concept' },
        { match: 'dim-depth', why: 'That is the whole floor plate, window to window. Lease depth is one side only: core to window.', category: 'concept' },
        { match: 'dimension', why: 'That dimension measures something else. Lease depth is from the core to the window wall, on the left-hand stack.', category: 'concept' },
        { match: 'core', why: 'That is the core. Lease depth is the distance from it to the window wall.', category: 'concept' },
      ],
    },
    explanation:
      'This floor has a {lease_depth}-ft lease depth on both sides of the core. Lease depth and column spacing ({column_spacing} ft here) decide how easily a tenant can fit offices along the windows and open space behind them. Too shallow and there is little room behind the window offices; too deep and the middle of the floor is far from daylight.',
  },
  {
    id: 'plan-reading-buildings-measure-load-factor',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Load factor of an office floor',
    prompt:
      'On this floor the four suites (the tenants’ own space, called usable area) total {usable_sf|int} SF. The stairs, elevators and shaft are openings through the floor and total {penetration_sf|int} SF. Rentable area is the whole floor plate less those openings. Using the overall dimensions of the floor plate, what is the load factor: rentable area divided by usable area?',
    tags: ['office', 'load factor', 'rentable area', 'usable area'],
    estMinutes: 3,
    hints: [
      'Find the floor plate’s overall length and depth on the outermost dimension strings.',
      'Rentable = floor plate area less the openings through the floor. The corridor, lobby and restrooms stay in.',
      'Load factor = (length x depth - openings) / usable area.',
    ],
    plan: { set: 'office-floor', variants: OFFICE, sheet: 'A-104' },
    task: {
      kind: 'measure',
      answer: '=load_factor',
      format: 'num2',
      tolerance: { abs: 0.01 },
      tool: 'real',
      mistakes: [
        { formula: '=usable_sf/rentable_sf', label: 'Upside down. The load factor is rentable over usable, so it is always above 1.', category: 'concept' },
        { formula: '=plate_sf/usable_sf', label: 'You kept the stairs, elevators and shaft. They are openings through the floor and are taken out of rentable area.', category: 'omitted' },
        { formula: '=(plate_sf-core_sf)/usable_sf', label: 'You took out the whole core. Only the openings come out: the lobby and restrooms are shared space that tenants pay for through the load factor.', category: 'wrong-base' },
      ],
    },
    explanation:
      'Floor plate = {plate_length} x {plate_depth} = {plate_sf|int} SF. Rentable = {plate_sf|int} - {penetration_sf|int} = {rentable_sf|int} SF. Load factor = {rentable_sf|int} / {usable_sf|int} = {load_factor|num2}. A tenant pays rent on its usable area times {load_factor|num2}, which is how it pays its share of the corridor, lobby and restrooms. Published measurement standards settle the details; this is the basic idea.',
  },

  // ---------------------------------------------------------------- podium and parking
  {
    id: 'plan-reading-buildings-measure-stall-count',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Count the parking',
    prompt: 'This is the underground parking level of a mixed-use building. How many cars can park on it?',
    tags: ['parking', 'stall count', 'accessible stalls', 'takeoff'],
    estMinutes: 3,
    hints: [
      'Count one row of stalls, then work out how many rows there are.',
      'Look closely at the end of each south row: one stall has a wheelchair symbol, and the hatched space beside it is not a stall.',
      'Per module: a full north row, plus the south row less two positions, plus one accessible stall.',
    ],
    plan: { set: 'podium-mixed-use', variants: GARAGE, sheet: 'A-100' },
    task: {
      kind: 'measure',
      answer: '=total_stalls',
      format: 'int',
      unit: 'stalls',
      tolerance: { abs: 0.4 },
      tool: 'none',
      mistakes: [
        { formula: '=standard_stalls', label: 'You left out the accessible stalls (the ones with the wheelchair symbol). They are parking stalls too.', category: 'omitted' },
        { formula: '=modules*2*stalls_per_row', label: 'The hatched space beside each accessible stall is an access aisle. It is kept clear so a wheelchair or ramp can get out of the car, and nobody can park there.', category: 'double-count' },
        { formula: '=total_stalls/2', label: 'That is half the garage. There are two parking modules, each with two rows of stalls and an aisle between them.', category: 'omitted' },
      ],
    },
    explanation:
      'Each of the {modules} modules has a north row of {stalls_per_row} stalls and a south row where the last two positions become one accessible stall and its access aisle. That is {total_stalls} stalls: {standard_stalls} standard and {accessible_stalls} accessible. The garage works out to {sf_per_stall|int} SF per stall once the aisles, ramp and cores are counted, which is why parking is so expensive to build.',
  },
  {
    id: 'plan-reading-buildings-identify-podium',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'What is the podium?',
    prompt: 'This section cuts through a mixed-use building. What is the thick, highlighted slab?',
    tags: ['podium', 'section', 'mixed use'],
    estMinutes: 1,
    hints: ['Read the labels of the floors above and below it.', 'Notice that the building changes above it: the floors are narrower and look different.'],
    plan: { set: 'podium-mixed-use', variants: SECTION, sheet: 'A-301' },
    task: {
      kind: 'identify',
      highlight: 'podium',
      correct: 'The podium: a concrete slab that carries the apartment floors above the shops and parking',
      distractors: [
        { text: 'The foundation', why: 'The foundation is below the lowest level, under the parking. This slab is at the top of the retail floor, under the apartments.', category: 'concept' },
        { text: 'The ground floor slab at street level', why: 'Street level is the bottom of the retail floor, marked LEVEL 1, EL. +0\'-0". The highlighted slab is a whole storey higher.', category: 'concept' },
        { text: 'The roof', why: 'The roof is at the top of the building, above the last floor of apartments. This slab has apartments above it.', category: 'concept' },
      ],
    },
    explanation:
      'In a podium building the lower floors (parking, shops, the lobby) are built in concrete and topped by a heavy slab: the podium. Lighter construction for the apartments sits on top of it. Here the podium is {retail_height} ft above the street, with {res_storeys} floors of apartments above. Where the garage is wider than the apartment floors, the space on top of the podium becomes a courtyard or terrace.',
  },

  // ---------------------------------------------------------------- concepts
  {
    id: 'plan-reading-buildings-flashcard-double-loaded',
    type: 'flashcard',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Double-loaded corridor',
    prompt: 'What is a double-loaded corridor, and why do most apartment buildings use one?',
    tags: ['multifamily', 'corridor', 'efficiency'],
    estMinutes: 0.5,
    answer:
      'A corridor with apartments on both sides. One corridor serves twice as many units as a single-loaded corridor (units on one side only), so less of each floor is corridor and more is rentable. Stairs usually sit at or near the ends, so that people in the corridor have two directions of escape.',
    explanation: 'Single-loaded corridors appear where a building is too narrow for two rows of units or where every unit needs the same view.',
  },
  {
    id: 'plan-reading-buildings-flashcard-podium-wrap',
    type: 'flashcard',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Podium and wrap buildings',
    prompt: 'Mid-rise apartment buildings with structured parking are often described as "podium" or "wrap" buildings. What is the difference?',
    tags: ['podium', 'wrap', 'mixed use', 'parking'],
    estMinutes: 0.5,
    answer:
      'Podium: the apartments sit ON TOP of a concrete base that holds the parking (often below grade) and ground-floor shops or lobby. Wrap: the apartments are built AROUND a free-standing parking garage, hiding it from the street. Both let one building combine housing and structured parking; which fits depends on the site’s size and shape and on cost.',
    explanation: 'On a plan set, a podium shows up as a parking level under the apartments in the section. A wrap shows the garage in the middle of the floor plans with units around it.',
  },
  {
    id: 'plan-reading-buildings-flashcard-parking-module',
    type: 'flashcard',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'The parking module',
    prompt: 'What is a parking module, and how wide is one in this app’s drawings?',
    tags: ['parking', 'parking module', 'garage layout'],
    estMinutes: 0.5,
    answer:
      'Two rows of stalls facing one shared drive aisle. Width = stall depth + aisle + stall depth: in this app’s illustrative drawings, 18 + 24 + 18 = 60 ft. A garage is laid out as a number of modules side by side. Real minimum sizes come from the local code.',
    explanation: 'Because a module is about 60 ft wide, a site’s width decides how many modules fit and therefore how many stalls, which is why parking often drives a building’s footprint.',
  },
  {
    id: 'plan-reading-buildings-mcq-lease-depth',
    type: 'mcq',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Shallow or deep office floors?',
    prompt:
      'Two office floor plates have the same area. On one the lease depth (core to window) is 40 ft; on the other it is 60 ft. What is generally true of the deeper floor?',
    tags: ['office', 'lease depth', 'floor plate'],
    estMinutes: 1,
    hints: ['Think about where the daylight is.', 'Where would a tenant put private offices, and what would be left behind them?'],
    correct: { text: 'More of each tenant’s space is far from a window, so it is harder to lay out well and appeals to fewer tenants' },
    distractors: [
      { text: 'It is always more valuable, because a deeper plate wastes less space on exterior walls', why: 'A deep plate can be efficient to build, but space far from the windows is darker and harder to use. Tenants pay for usable space, not for construction efficiency.', category: 'concept' },
      { text: 'Lease depth makes no difference; tenants only care about total area', why: 'Two suites of the same area can work very differently. Depth decides how many offices fit along the glass and how much dark space is left in the middle.', category: 'concept' },
      { text: 'It needs more elevators', why: 'Elevators depend on how many people a building holds and how tall it is. The two floors here have the same area.', category: 'concept' },
    ],
    explanation:
      'Daylight reaches only so far into a building. A tenant puts private offices or desks along the windows and support space behind them; on a very deep floor the middle is far from any window. That is why lease depth is one of the first things a broker checks on an office floor plan.',
  },
  {
    id: 'plan-reading-buildings-mcq-frontage',
    type: 'mcq',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'Frontage or depth?',
    prompt:
      'Two empty shops each have 1,500 SF. One is 25 ft wide and 60 ft deep; the other is 15 ft wide and 100 ft deep. All else being equal, which do most retail tenants prefer, and why?',
    tags: ['retail', 'frontage', 'shop depth'],
    estMinutes: 1,
    hints: ['What does a passer-by on the sidewalk see of each shop?'],
    correct: { text: 'The 25-ft-wide shop: more frontage means a longer storefront, more visibility and a shallower space that is easier to fill' },
    distractors: [
      { text: 'The 15-ft-wide shop: a deep space holds more stock', why: 'Both shops hold the same area. The narrow one shows less to the street and leaves a long, dark back half.', category: 'concept' },
      { text: 'Neither: tenants pay for area, so shape does not matter', why: 'Rent is usually quoted per SF, but frontage is what makes those square feet earn money. Shape matters a great deal in retail.', category: 'concept' },
      { text: 'The 15-ft-wide shop, because narrow storefronts cost less to build', why: 'A narrower storefront may cost a little less, but the tenant cares about sales, and sales follow visibility.', category: 'concept' },
    ],
    explanation:
      'In retail, frontage sells. A wider storefront shows more of the shop to passers-by and leaves a shallower, more usable space behind it. That is why corner shops, with two street faces, usually lease first, and why shop depth is planned to suit the tenants a landlord expects.',
  },
  {
    id: 'plan-reading-buildings-judgment-missing-stair',
    type: 'judgment',
    level: 2,
    topic: 'plan-reading-buildings',
    title: 'A test fit that gains units by losing a stair',
    prompt:
      'Your architect’s latest test fit for a mid-rise apartment building in North Park (illustrative) shows {units_added} more apartments than the last scheme. Reading the floor plan, you notice how: one of the two stairs is gone, and the corridor now ends at a single stair. In your pro forma the extra units add about {value|usd} of value. What do you do?',
    tags: ['test fit', 'egress', 'multifamily', 'pro forma'],
    estMinutes: 3,
    hints: ['Who decides whether a floor plan meets the building code, and when?', 'Ask what happens to the number if the change does not survive review.'],
    vars: [
      { name: 'units_added', choices: [4, 5, 8] },
      { name: 'value', formula: '=units_added*425000', format: 'usd' },
    ],
    options: [
      {
        text: 'Raise it with the architect now and have the exit requirements confirmed by the architect or a code consultant before the extra units go into any numbers. Apartment floors served by a corridor usually need two separate ways out.',
        rating: 'best',
        why: 'The extra units depend on a single design decision that may not be allowed. Checking it now costs a phone call; finding out at permit review costs a redesign and units you may already have promised.',
      },
      {
        text: 'Keep the extra units in the base case, but run a downside case without them until the exits are confirmed.',
        rating: 'acceptable',
        why: 'Showing the downside is sensible, but leading with numbers that rest on an unconfirmed design invites the investment committee to anchor on them. Confirm first.',
      },
      {
        text: 'Put the extra units in the pro forma. Code compliance is the architect’s responsibility, not yours.',
        rating: 'poor',
        why: 'The architect is responsible for the design, but you own the numbers. A pro forma built on a plan you suspect is wrong is your problem when the plan changes.',
        category: 'concept',
      },
      {
        text: 'Tell the investors the project now has {units_added} more apartments, since the plan shows them.',
        rating: 'poor',
        why: 'A test fit is an early study, not an approved design. Announcing a gain before it is checked is the fastest way to lose credibility when it disappears.',
        category: 'concept',
      },
    ],
    explanation:
      'Reading plans is not about doing the architect’s job; it is about noticing when a number depends on something that might not hold. Stairs, exits and parking are the usual suspects: they take space from rentable area, so test fits are tempted to trim them. Two stairs at opposite ends of a corridor is the pattern this course’s drawings use for a reason.',
  },
]);
