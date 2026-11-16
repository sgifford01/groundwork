/**
 * Entitlements & Zoning: approvals and permits (subtopic entitlements-approvals).
 *
 * General concepts carry `noLegalClaim: true`. Anything that names a California
 * rule was checked at the primary source on the date in `verifiedAsOf` and is
 * listed in VERIFICATION_LOG.md (rows 2-4, 9, 10, 13-15).
 */
import { categoryItems } from '../define';

const CHECKED = '2026-11-15';
const PRC_21080 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21080.';
const PRC_21152 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21152.';
const GOV_66498_1 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66498.1.';

export const ITEMS = categoryItems('entitlements', [
  {
    id: 'entitlements-approvals-flashcard-entitlement-vs-permit',
    type: 'flashcard',
    level: 1,
    topic: 'entitlements-approvals',
    noLegalClaim: true,
    title: 'Entitlement vs. building permit',
    prompt: 'In general terms (a concept, not any one code), what is the difference between an entitlement and a building permit?',
    tags: ['entitlement', 'building permit', 'approvals'],
    estMinutes: 0.5,
    answer:
      'An entitlement approves WHAT may be built and how the land is used: the use, the density, the height, the site plan, any variance or conditional use permit, a subdivision map. A building permit comes later and confirms HOW it will be built: that the construction drawings meet the building, fire and safety codes. Land value is created at entitlement; the building permit lets construction start.',
    explanation: 'Investors price the entitlement. For a project that is already entitled, the building permit is mostly a question of plan-check time and fees, not of whether the project may exist.',
  },
  {
    id: 'entitlements-approvals-mcq-ministerial-approval',
    type: 'mcq',
    level: 1,
    topic: 'entitlements-approvals',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21080,
    title: 'Which approval is ministerial?',
    prompt:
      'In California (law as of November 2026), which of these approvals is ministerial, meaning the agency checks fixed, objective standards and must approve if they are met?',
    tags: ['ministerial', 'discretionary', 'variance', 'conditional use permit', 'rezoning', 'CEQA'],
    estMinutes: 1,
    hints: ['Ask whether the decision-maker has any choice to make once the standards are met.'],
    correct: { text: 'A building permit for plans that meet every objective code standard' },
    distractors: [
      {
        text: 'A conditional use permit for a restaurant open until 2 a.m.',
        why: "A conditional use permit is discretionary: the decision-maker weighs the use, attaches conditions or denies it. California's CEQA statute names conditional use permits among discretionary approvals.",
        category: 'concept',
      },
      { text: 'A variance to build closer to the side lot line', why: 'A variance needs findings that the decision-maker can decline to make, so it is discretionary. The CEQA statute names variances too.', category: 'concept' },
      {
        text: 'A rezoning from commercial to residential',
        why: "A rezoning changes the zoning ordinance itself, which is about as discretionary as an approval gets. California's CEQA statute names zoning amendments among discretionary approvals.",
        category: 'concept',
      },
    ],
    explanation:
      "A ministerial approval applies fixed, objective standards: once they are met, the agency has no choice to make. California's CEQA statute (Public Resources Code section 21080, checked November 2026) names the enactment and amendment of zoning ordinances, variances, conditional use permits and tentative subdivision maps as discretionary approvals, and excludes ministerial projects from CEQA altogether. A building permit for plans that comply is the usual example of a ministerial approval.",
  },
  {
    id: 'entitlements-approvals-order-discretionary-steps',
    type: 'order',
    level: 1,
    topic: 'entitlements-approvals',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21152,
    title: 'The path of a discretionary approval',
    prompt:
      'Put these steps in order. A project in a California city needs a conditional use permit, and the city prepares a mitigated negative declaration under CEQA. (Deadlines are California law as of November 2026; local appeal periods vary.)',
    tags: ['discretionary approval', 'Permit Streamlining Act', 'CEQA', 'notice of determination', 'appeal'],
    estMinutes: 1.5,
    hints: ['Completeness comes before any review of the merits.', 'The notice that starts the CEQA lawsuit clock can only be filed once the approval is final.'],
    lines: [
      'The applicant submits the application',
      'The city decides in writing whether the application is complete (within 30 calendar days)',
      'An initial study and a mitigated negative declaration are prepared and released for public review',
      'Staff publish a report with a recommendation',
      'The decision-maker holds a public hearing and approves the permit',
      'The appeal period ends and the approval becomes final',
      'The city files a notice of determination (within five working days)',
      'The 30-day window to sue under CEQA closes',
    ],
    trap: 'The CEQA clock does not start at the hearing. It starts when the notice of determination is filed, and that can only happen after the approval is final.',
    explanation:
      "Each deadline here is in a statute (checked November 2026): the city has 30 calendar days to decide whether an application is complete (Government Code section 65943); a negative declaration is adopted when the project, as revised, will not have a significant effect (Public Resources Code section 21080(c)); the notice of determination is filed within five working days after the approval becomes final (section 21152); and a lawsuit over the negative declaration must be filed within 30 days of that notice (section 21167). Only after that window closes is the approval reasonably safe to finance.",
  },
  {
    id: 'entitlements-approvals-judgment-variance-or-redesign',
    type: 'judgment',
    level: 1,
    topic: 'entitlements-approvals',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21080,
    title: 'Redesign, or ask for a variance?',
    prompt:
      'Your {units}-unit design is {over} ft over the height limit of a hypothetical zone. Taking one floor off makes it meet every objective standard with {fewer} fewer homes, and the city would approve it ministerially in about {fast} months. Keeping the floor needs a variance: a public hearing, CEQA review and a possible appeal, about {slow} months. Holding the site costs {carry|usd} a month. (Illustrative figures; California law as of November 2026.) What do you do?',
    tags: ['variance', 'ministerial', 'discretionary', 'carry cost', 'entitlement risk'],
    estMinutes: 2,
    vars: [
      { name: 'units', choices: [40, 48, 56] },
      { name: 'over', choices: [4, 6, 8] },
      { name: 'fewer', choices: [6, 8] },
      { name: 'fast', choices: [5, 6, 7] },
      { name: 'slow', choices: [16, 18, 20] },
      { name: 'carry', min: 40000, max: 80000, step: 5000, format: 'usd' },
    ],
    options: [
      {
        text: 'Price both paths before choosing: the value of the {fewer} extra homes against about {=carry*(slow-fast)|usd} of extra carry, plus the chance the variance is denied, conditioned or appealed. Keep the code-compliant design ready as the fallback.',
        rating: 'best',
        why: 'A variance is discretionary: the decision-maker must make findings and can deny or condition it, and it brings the project under CEQA unless an exemption applies, while a ministerial approval does not. Which path wins depends on numbers, so run them.',
      },
      {
        text: 'Take the code-compliant design: a ministerial approval in about {fast} months is worth more than {fewer} uncertain homes.',
        rating: 'acceptable',
        why: 'Often the right call, and it removes the hearing, CEQA and appeal risk. But it gives up {fewer} homes without checking whether they are worth more than the extra time and risk.',
      },
      {
        text: 'Apply for the variance and plan on getting it, because the building is only {over} ft too tall.',
        rating: 'poor',
        why: 'A variance needs findings the decision-maker can decline to make, however small the exceedance. Planning on it is planning on someone else\'s discretion.',
        category: 'concept',
      },
      {
        text: 'Submit the taller design for ministerial approval and sort out the height in plan check.',
        rating: 'poor',
        why: 'A ministerial approval only covers a design that meets every objective standard. The taller building cannot be approved that way, and finding out in plan check wastes months.',
        category: 'concept',
      },
    ],
    explanation:
      "Under California's CEQA statute (Public Resources Code section 21080, checked November 2026) variances are discretionary approvals and ministerial projects are outside CEQA. That is the real trade: certainty and speed against {fewer} homes. Put a number on each side ({=carry*(slow-fast)|usd} of extra carry alone, before any appeal) and decide on the value, not on instinct.",
  },
  {
    id: 'entitlements-approvals-docreview-staff-report',
    type: 'docreview',
    level: 1,
    topic: 'entitlements-approvals',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21080,
    title: 'Check the staff report summary',
    prompt:
      'This is the summary page of a fictional staff report for a project in a HYPOTHETICAL zone (standards invented for practice; the CEQA point is California law as of November 2026). Flag every line that contains an error.',
    tags: ['staff report', 'FAR', 'parking', 'ministerial', 'discretionary', 'CEQA'],
    estMinutes: 4,
    hints: ['Recompute every number from the lines above it.', 'Compare the decision process with the approvals requested and the hearing listed.'],
    vars: [
      { name: 'lot', choices: [18000, 21000, 24000], format: 'int' },
      { name: 'cov', choices: [0.55, 0.6, 0.65], format: 'pct' },
      { name: 'storeys', choices: [4, 5] },
      { name: 'footprint', formula: '=lot*cov', format: 'int' },
      { name: 'floor', formula: '=footprint*storeys', format: 'int' },
      { name: 'max_far', choices: [3.5, 4], format: 'num2' },
      { name: 'max_cov', choices: [0.7, 0.75], format: 'pct' },
      // odd unit counts and these ratios never give a whole number of stalls, so rounding always matters
      { name: 'units', choices: [41, 43, 47, 53] },
      { name: 'ratio', choices: [1.15, 1.25, 1.35], format: 'num2' },
      { name: 'req_wrong', formula: '=ROUNDDOWN(units*ratio,0)', format: 'int' },
      { name: 'provided', formula: '=ROUNDUP(units*ratio,0)+2', format: 'int' },
    ],
    document: {
      kind: 'Staff report summary',
      title: 'Staff report summary: 3400 Example Street (fictional project, hypothetical zone)',
      columns: ['Item', 'The report says'],
      lines: [
        { id: 'lot', text: 'Lot area', cells: ['{lot|int} SF'] },
        { id: 'floor-area', text: 'Proposed floor area', cells: ['{floor|int} SF on {storeys} storeys'] },
        { id: 'far', text: 'Floor area ratio (FAR)', cells: ['{cov|num2} (zone maximum {max_far|num2})'] },
        { id: 'coverage', text: 'Lot coverage', cells: ['{cov|pct} (zone maximum {max_cov|pct})'] },
        { id: 'units', text: 'Homes', cells: ['{units}'] },
        { id: 'parking-required', text: 'Parking required', cells: ['{req_wrong} stalls ({units} homes x {ratio|num2}; the code rounds up)'] },
        { id: 'parking-provided', text: 'Parking provided', cells: ['{provided} stalls'] },
        { id: 'approvals', text: 'Approvals requested', cells: ['Conditional use permit; variance for height'] },
        { id: 'process', text: 'Decision process', cells: ['Ministerial: staff approve if the standards are met'] },
        { id: 'hearing', text: 'Hearing', cells: ['Planning Commission public hearing'] },
        { id: 'ceqa', text: 'Environmental review', cells: ['Not required, because the approvals are ministerial'] },
        { id: 'recommendation', text: 'Staff recommendation', cells: ['Approve, with conditions'] },
      ],
    },
    issues: [
      {
        lines: ['far'],
        label: 'FAR is floor area / lot area: {floor|int} / {lot|int} = {=floor/lot|num2}. The report shows the lot coverage instead. Check the real FAR against the zone maximum of {max_far|num2}.',
        category: 'concept',
      },
      { lines: ['parking-required'], label: '{units} x {ratio|num2} = {=units*ratio|num2}, and the code rounds UP: {=ROUNDUP(units*ratio,0)} stalls, not {req_wrong}.', category: 'function' },
      {
        lines: ['process'],
        label: 'A conditional use permit and a variance are discretionary: the decision-maker weighs them at the public hearing listed below and can deny or condition them. Nothing about this process is ministerial.',
        category: 'concept',
      },
      {
        lines: ['ceqa'],
        label: "Under California's CEQA statute (as of November 2026) variances and conditional use permits are discretionary approvals that CEQA applies to unless an exemption does. 'Ministerial' is wrong here, so it cannot be the reason to skip review.",
        category: 'concept',
      },
    ],
    explanation:
      "Two arithmetic slips and two process errors. The FAR line shows the coverage ({cov|num2}) instead of floor area / lot area ({=floor/lot|num2}); the parking is rounded down although the code rounds up. And a project that needs a conditional use permit and a variance, with a public hearing, is discretionary, so the claim that CEQA does not apply because the approvals are ministerial fails twice (Public Resources Code section 21080, checked November 2026).",
  },
  {
    id: 'entitlements-approvals-flashcard-vesting',
    type: 'flashcard',
    level: 1,
    topic: 'entitlements-approvals',
    verifiedAsOf: CHECKED,
    sourceUrl: GOV_66498_1,
    title: 'What a vesting tentative map locks in',
    prompt: 'In California (law as of November 2026), what does the approval of a vesting tentative map give a developer?',
    tags: ['vesting', 'tentative map', 'subdivision', 'entitlement risk'],
    estMinutes: 0.5,
    answer:
      'A vested right to proceed with the development in substantial compliance with the ordinances, policies and standards in effect on the date the city found the application complete, even if the city changes its rules later. The exceptions: the city can still condition or deny a later approval to protect health and safety or to comply with state or federal law; a rule change the city had already started and publicly noticed before the completeness date can apply; and the right lapses if the final map is not approved before the vesting tentative map expires.',
    explanation:
      'Entitlements take months, and a downzoning or a new standard adopted in the meantime can change what a site is worth. Locking in the rules early is what vesting buys. (Government Code sections 66498.1 and 66474.2, checked November 2026.)',
  },
]);
