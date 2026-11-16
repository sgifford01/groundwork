/**
 * Entitlements & Zoning: CEQA (subtopic entitlements-ceqa).
 *
 * Every question here states California law and was checked at the primary
 * source on the date in `verifiedAsOf`: the Public Resources Code on
 * leginfo.legislature.ca.gov and the CEQA Guidelines (Title 14 of the
 * California Code of Regulations) on govt.westlaw.com. See VERIFICATION_LOG.md
 * (rows 1-12).
 */
import { categoryItems } from '../define';

const CHECKED = '2026-11-15';
const PRC_21065 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21065.';
const PRC_21080 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21080.';
const PRC_21167 = 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PRC&sectionNum=21167.';
const CCR_15332 =
  'https://govt.westlaw.com/calregs/Document/I8D95B1D65B4D11EC976B000D3A7C4BC3?viewType=FullText&originationContext=documenttoc&transitionType=CategoryPageItem&contextData=(sc.Default)';

export const ITEMS = categoryItems('entitlements', [
  {
    id: 'entitlements-ceqa-flashcard-project',
    type: 'flashcard',
    level: 1,
    topic: 'entitlements-ceqa',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21065,
    title: 'What CEQA covers',
    prompt: "Under California's Environmental Quality Act (CEQA, as of November 2026), what is a 'project', and which projects does CEQA apply to?",
    tags: ['CEQA', 'project', 'discretionary', 'ministerial'],
    estMinutes: 0.5,
    answer:
      'A project is an activity that may cause a direct physical change in the environment, or a reasonably foreseeable indirect one, and that a public agency carries out, funds, or approves through a permit, lease, licence or other entitlement. CEQA applies to DISCRETIONARY projects (the statute names rezonings, variances, conditional use permits and tentative subdivision maps) unless an exemption applies; it does not apply to ministerial projects. Where it applies, the agency must identify significant effects, and should not approve a project as proposed if feasible mitigation or alternatives would substantially lessen them. It may still approve despite significant effects when mitigation is infeasible.',
    explanation:
      'Public Resources Code sections 21065 (project), 21080 (discretionary and ministerial) and 21002 and 21002.1 (mitigation and alternatives), checked November 2026. CEQA is mostly a disclosure and mitigation process attached to discretionary decisions: it shapes what gets approved and adds time and lawsuit risk, but it does not by itself approve or deny anything.',
  },
  {
    id: 'entitlements-ceqa-mcq-ministerial-project',
    type: 'mcq',
    level: 1,
    topic: 'entitlements-ceqa',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21080,
    title: 'CEQA and a by-right project',
    prompt:
      'A 40-unit project meets every objective standard and needs only ministerial approvals: staff must approve it if the standards are met. Under CEQA (California, as of November 2026), what environmental review does it need?',
    tags: ['CEQA', 'ministerial', 'exemption', 'by-right'],
    estMinutes: 1,
    hints: ['CEQA attaches to decisions in which the agency has a choice to make.'],
    correct: { text: 'None: CEQA does not apply to ministerial projects' },
    distractors: [
      { text: 'A negative declaration, because the project is small', why: 'Size does not decide it. CEQA applies to discretionary approvals, and a project that needs only ministerial ones is outside it.', category: 'concept' },
      {
        text: 'An EIR, because the project needs a building permit',
        why: "A permit can make an activity a CEQA 'project', but the statute excludes ministerial projects altogether.",
        category: 'concept',
      },
      {
        text: 'A categorical exemption, which the city must find before approving',
        why: 'Categorical exemptions are for discretionary projects that would otherwise need review. A ministerial project is excluded by the statute itself, so no exemption is needed.',
        category: 'concept',
      },
    ],
    explanation:
      "Public Resources Code section 21080(b)(1) (checked November 2026): CEQA does not apply to ministerial projects carried out or approved by public agencies. That is why designing to meet every objective standard, so the approvals are ministerial, can take environmental review, its timeline and its lawsuit risk off the table.",
  },
  {
    id: 'entitlements-ceqa-mcq-infill-exemption',
    type: 'mcq',
    level: 1,
    topic: 'entitlements-ceqa',
    verifiedAsOf: CHECKED,
    sourceUrl: CCR_15332,
    title: 'Can it use the in-fill exemption?',
    prompt:
      "Each of these infill projects is consistent with the general plan and zoning, would have no significant effects on traffic, noise, air or water quality, can be served by utilities and public services, and has no value as habitat for endangered, rare or threatened species. Under the CEQA Guidelines' Class 32 in-fill exemption (California, as of November 2026), which one can use the exemption?",
    tags: ['CEQA', 'categorical exemption', 'Class 32', 'infill'],
    estMinutes: 1.5,
    hints: ['Class 32 limits the site\'s size and where it is.', 'Even a qualifying project cannot use a categorical exemption if one of the listed exceptions applies.'],
    correct: { text: 'A 3.2-acre site within city limits, substantially surrounded by urban uses' },
    distractors: [
      { text: 'A 6-acre site within city limits, substantially surrounded by urban uses', why: 'Class 32 covers project sites of no more than five acres.', category: 'concept' },
      { text: 'A 2-acre site substantially surrounded by urban uses, in unincorporated county land', why: 'The site must be within city limits.', category: 'concept' },
      {
        text: 'A 3-acre site within city limits, substantially surrounded by urban uses, that is on the state list of hazardous waste sites',
        why: 'It meets Class 32, but a categorical exemption cannot be used on a site on the list compiled under Government Code section 65962.5. That is one of the exceptions in Guidelines section 15300.2.',
        category: 'concept',
      },
    ],
    explanation:
      'Class 32 (CEQA Guidelines, 14 CCR section 15332, checked November 2026) has five conditions: consistent with the general plan and zoning; within city limits on a site of no more than five acres substantially surrounded by urban uses; no habitat value for endangered, rare or threatened species; no significant traffic, noise, air or water quality effects; adequately served by utilities and public services. Section 15300.2 then lists exceptions that rule out any categorical exemption, including a listed hazardous waste site, a substantial adverse change to a historical resource, and unusual circumstances that make a significant effect reasonably possible.',
  },
  {
    id: 'entitlements-ceqa-numeric-challenge-window',
    type: 'numeric',
    level: 1,
    topic: 'entitlements-ceqa',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21167,
    title: 'When can no one sue?',
    prompt:
      'The city approves your project with a mitigated negative declaration. The approval becomes final {appeal} days later, when the local appeal period ends, and the city files its notice of determination {lag} days after that (illustrative timing). Your lender will fund only once the window to sue under CEQA has closed. Under the statute as of November 2026, how many days after the approval does that window close?',
    tags: ['CEQA', 'statute of limitations', 'notice of determination', 'schedule'],
    estMinutes: 2,
    hints: [
      'The lawsuit clock starts when the notice of determination is filed, not on the day of the approval.',
      'After a notice of determination, a challenge to a negative declaration must be filed within 30 days.',
      'Days = appeal period + days until the notice is filed + 30.',
    ],
    vars: [
      { name: 'appeal', choices: [10, 12, 15] },
      { name: 'lag', choices: [2, 3, 5, 7] },
    ],
    answer: '=appeal+lag+30',
    format: 'int',
    unit: 'days after the approval',
    tolerance: { abs: 0.4 },
    mistakes: [
      { formula: '=appeal+lag+35', label: '35 days applies after a notice of EXEMPTION. After a notice of determination the window is 30 days.', category: 'concept' },
      { formula: '=appeal+lag+180', label: '180 days applies only when no notice is filed. Filing the notice of determination cuts the window to 30 days.', category: 'concept' },
      { formula: '=appeal+30', label: 'The 30 days run from the filing of the notice, {lag} days after the approval became final. Add them.', category: 'omitted' },
      { formula: '=lag+30', label: 'The notice can only be filed once the approval is final, {appeal} days after the approval. Add those days.', category: 'omitted' },
      { formula: '=30', label: 'The window starts when the notice of determination is filed, not on the day of the approval.', category: 'timing' },
    ],
    explanation:
      'The approval becomes final after {appeal} days, the notice of determination is filed {lag} days later, and a suit over the negative declaration must then be filed within 30 days: {appeal} + {lag} + 30 = {=appeal+lag+30} days (Public Resources Code sections 21152 and 21167, checked November 2026). A notice of exemption starts a 35-day window instead, and with no notice at all the window stays open for 180 days, which is why developers make sure the notice is filed promptly.',
  },
  {
    id: 'entitlements-ceqa-judgment-mnd-or-eir',
    type: 'judgment',
    level: 1,
    topic: 'entitlements-ceqa',
    verifiedAsOf: CHECKED,
    sourceUrl: PRC_21080,
    title: 'Negative declaration or EIR?',
    prompt:
      "Your consultant has drafted a mitigated negative declaration for a 120-unit project. During public review, neighbours submit a traffic engineer's study, built on counts and calculations, concluding that a nearby intersection would fail. Other neighbours write that the project 'will ruin the neighbourhood'. The city asks how you want to proceed. (CEQA as of November 2026.)",
    tags: ['CEQA', 'mitigated negative declaration', 'EIR', 'substantial evidence', 'litigation risk'],
    estMinutes: 2,
    options: [
      {
        text: "Take the engineer's study seriously: unless it can be shown to be wrong on the facts, prepare an EIR rather than adopt the negative declaration.",
        rating: 'best',
        why: 'An EIR is required when there is substantial evidence that the project may have a significant effect, and expert opinion supported by fact counts as substantial evidence. Adopting the negative declaration over it invites a lawsuit within 30 days of the notice of determination, which can cost more time than the EIR.',
      },
      {
        text: "Have your own engineer check the study, and answer it in writing with evidence before the city adopts the negative declaration.",
        rating: 'acceptable',
        why: "Sensible as a first step: evidence that is clearly inaccurate is not substantial evidence. But if the study's facts hold up, the negative declaration stays vulnerable, so this only delays the real decision.",
      },
      {
        text: "Adopt the negative declaration: the neighbours' objections are just opinion.",
        rating: 'poor',
        why: "The letters saying it will ruin the neighbourhood are unsubstantiated opinion and do not count, but the engineer's study is expert opinion supported by fact, which does.",
        category: 'concept',
      },
      {
        text: 'Adopt the negative declaration and start spending on construction drawings straight away; any lawsuit can be dealt with later.',
        rating: 'poor',
        why: 'A successful challenge can set the approval aside. The short window after the notice of determination exists so that this risk is settled before money is committed.',
        category: 'timing',
      },
    ],
    explanation:
      'Public Resources Code section 21080 (checked November 2026): a negative declaration is adopted only when there is no substantial evidence, on the whole record, that the project may have a significant effect; if there is such evidence, an EIR must be prepared. Substantial evidence includes expert opinion supported by fact, but not argument, speculation or unsubstantiated opinion. Choosing the document is a schedule decision as much as a legal one: the cheaper document can be the slower path if it ends in court.',
  },
]);
