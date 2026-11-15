/**
 * THE QUESTION SCHEMA.
 *
 * Every question in src/content/items/ must match one of the shapes below.
 * `npm run validate` checks every item against this file, so a typo in a
 * question shows up as a clear error instead of a broken screen.
 *
 * Golden rule: numeric answers are never typed in. They are formulas that the
 * engine evaluates, so answers stay right when inputs are randomised.
 */
import { z } from 'zod';
import { NUM_FORMATS } from '../engine/format';
import { CATEGORY_SLUGS, CATEGORY_TOPICS, CORE_CATEGORY } from './categories/registry';
import { TOPIC_IDS } from './topics';

/** Topics of the core course plus the subtopics of every other category. */
const KNOWN_TOPICS = new Set<string>([...TOPIC_IDS, ...CATEGORY_TOPICS.map((t) => t.id)]);

// ---- shared pieces --------------------------------------------------------

export const MISTAKE_CATEGORIES = [
  'hardcode', // typed a number where a formula/link belongs
  'reference', // wrong cell, or a $ anchor that let a reference drift
  'sign', // positive/negative flipped
  'timing', // off by one period, wrong year, beginning vs. end balance
  'units', // % vs decimal, monthly vs annual, per-unit vs total
  'wrong-base', // right operation on the wrong line (EGI instead of NOI)
  'double-count', // applied something twice
  'omitted', // left a line out
  'function', // misused or mistyped an Excel function
  'concept', // misunderstood the idea itself
  'arithmetic', // off, with no recognisable pattern
  'incomplete', // left blank
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

export const MISTAKE_LABELS: Record<MistakeCategory, string> = {
  hardcode: 'Hardcoded number',
  reference: 'Wrong reference or $ anchor',
  sign: 'Sign error',
  timing: 'Off-by-one period / timing',
  units: 'Units or scale',
  'wrong-base': 'Wrong base line',
  'double-count': 'Counted twice',
  omitted: 'Left something out',
  function: 'Function misuse',
  concept: 'Concept mix-up',
  arithmetic: 'Arithmetic slip',
  incomplete: 'Left blank',
};

const Format = z.enum(NUM_FORMATS);
const Category = z.enum(MISTAKE_CATEGORIES);
const Formula = z.string().regex(/^=./, 'a formula must start with "="');
const VarName = z.string().regex(/^[a-z][a-z_]*[a-z]$/, 'lowercase letters and underscores only, e.g. "exit_cap"');

/** How close an answer must be. Default is within 0.5%. */
const Tolerance = z
  .object({
    pct: z.number().positive().optional(), // 0.005 = within 0.5%
    abs: z.number().positive().optional(), // 1 = within 1 (dollar, unit, ...)
  })
  .strict();
export type Tolerance = z.infer<typeof Tolerance>;

/** A randomised input for numeric and multiple-choice questions. */
const Variable = z.union([
  z.object({ name: VarName, min: z.number(), max: z.number(), step: z.number().positive(), format: Format.optional() }).strict(),
  z.object({ name: VarName, choices: z.array(z.union([z.number(), z.string()])).min(2), format: Format.optional() }).strict(),
  // computed from earlier variables, e.g. { name: 'loan', formula: '=price*ltv' }
  z.object({ name: VarName, formula: Formula, format: Format.optional() }).strict(),
]);

// ---- the grid -------------------------------------------------------------

/** How the grader may change an input cell during the perturbation test. */
const Vary = z.union([
  z.object({ min: z.number(), max: z.number(), step: z.number().positive() }).strict(),
  z.object({ choices: z.array(z.union([z.number(), z.string(), z.boolean()])).min(2) }).strict(),
  z.literal(false), // never change this cell (e.g. a year label)
]);
export type Vary = z.infer<typeof Vary>;

const look = {
  bold: z.boolean().optional(),
  border: z.enum(['top', 'bottom', 'double']).optional(),
};

const LabelCell = z
  .object({
    kind: z.literal('label'),
    text: z.string(),
    style: z.enum(['title', 'header', 'normal', 'note', 'total']).optional(),
    align: z.enum(['left', 'right', 'center']).optional(),
    indent: z.number().int().min(0).max(3).optional(),
    ...look,
  })
  .strict();

/** Blue. A hardcoded assumption. The grader changes these to test your formulas. */
const InputCell = z
  .object({
    kind: z.literal('input'),
    value: z.union([z.number(), z.string(), z.boolean()]),
    format: Format.optional(),
    vary: Vary.optional(), // omitted = numbers move roughly -30%..+40%
    ...look,
  })
  .strict();

/** Black (green if it links to another sheet). A formula the student is given. */
const GivenCell = z.object({ kind: z.literal('given'), formula: Formula, format: Format.optional(), ...look }).strict();

/** Yellow. A cell the student must fill. `solution` is the model formula. */
const TargetCell = z
  .object({
    kind: z.literal('target'),
    solution: Formula,
    format: Format.optional(),
    tolerance: Tolerance.optional(),
    /** The value legitimately never changes (a check cell that is always 0). It must still be a formula. */
    allowConstant: z.boolean().optional(),
    ...look,
  })
  .strict();

const Cell = z.discriminatedUnion('kind', [LabelCell, InputCell, GivenCell, TargetCell]);
export type CellSpec = z.infer<typeof Cell>;
export type TargetSpec = z.infer<typeof TargetCell>;
export type InputSpec = z.infer<typeof InputCell>;

const CellAddress = z.string().regex(/^[A-Z]{1,2}[1-9][0-9]{0,2}$/, 'cell addresses look like "B7"');

const Sheet = z
  .object({
    name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'sheet names: letters, numbers, underscores'),
    widths: z.record(z.string(), z.number().positive()).optional(), // column letter -> pixels
    cells: z.record(CellAddress, Cell),
  })
  .strict();
export type SheetSpec = z.infer<typeof Sheet>;

// ---- fields every item has ------------------------------------------------

const base = {
  /** Unique, lowercase-with-dashes. Never change an id after release: progress is stored by id. */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  level: z.number().int().min(0).max(6),
  /** A topic id from topics.ts (core course) or a subtopic id from categories/registry.ts. */
  topic: z.string().refine((t) => KNOWN_TOPICS.has(t), 'unknown topic id'),
  /** Which category the question belongs to. Left out = the core Excel & Pro Forma course. */
  category: z.enum(CATEGORY_SLUGS).default(CORE_CATEGORY),
  /** For rules that change (laws, fees, programs): the date the fact was checked, as YYYY-MM-DD. */
  verifiedAsOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD')
    .optional(),
  /** The official source the fact was checked against. */
  sourceUrl: z.string().url().optional(),
  /** In a category that needs legal verification: this question states no real-world rule (pure math on a hypothetical). */
  noLegalClaim: z.boolean().optional(),
  /** Short name shown in lists. */
  title: z.string().min(3),
  /** The question. May use {variable} and {=formula|format} placeholders. */
  prompt: z.string().min(3),
  tags: z.array(z.string()).min(1),
  /** Rough minutes to complete; the session builder uses it to fill a time box. */
  estMinutes: z.number().positive(),
  /** Up to three hints: a nudge, the relevant concept or function, a partial formula.
   *  The fourth rung ("show the solution") is generated automatically. */
  hints: z.array(z.string()).max(3).default([]),
  /** Excel functions the item depends on, e.g. ['XLOOKUP'] (used to respect the Excel version). */
  requires: z.array(z.string()).default([]),
};

// ---- item types -----------------------------------------------------------

const Flashcard = z
  .object({
    ...base,
    type: z.literal('flashcard'),
    /** The back of the card. */
    answer: z.string().min(1),
    vars: z.array(Variable).default([]),
    explanation: z.string().optional(),
  })
  .strict();

const Option = z
  .object({
    text: z.string().optional(),
    formula: Formula.optional(),
  })
  .strict()
  .refine((o) => (o.text === undefined) !== (o.formula === undefined), 'give exactly one of text or formula');

const Distractor = z
  .object({
    text: z.string().optional(),
    formula: Formula.optional(),
    /** The misconception that leads here. Shown if the student picks it. */
    why: z.string().min(3),
    category: Category,
  })
  .strict()
  .refine((o) => (o.text === undefined) !== (o.formula === undefined), 'give exactly one of text or formula');

const Mcq = z
  .object({
    ...base,
    type: z.literal('mcq'),
    vars: z.array(Variable).default([]),
    correct: Option,
    distractors: z.array(Distractor).min(2).max(5),
    /** Display format for formula options. */
    format: Format.default('general'),
    explanation: z.string().min(3),
  })
  .strict();

const NumericMistake = z.object({ formula: Formula, label: z.string().min(3), category: Category }).strict();

const Numeric = z
  .object({
    ...base,
    type: z.literal('numeric'),
    vars: z.array(Variable).min(1),
    /** The answer key, as a formula over the variables. */
    answer: Formula,
    format: Format,
    /** Shown after the answer box, e.g. "per month". */
    unit: z.string().optional(),
    tolerance: Tolerance.default({ pct: 0.005 }),
    /** Wrong formulas students commonly use. Matched by value, then explained. */
    mistakes: z.array(NumericMistake).min(1),
    explanation: z.string().min(3),
  })
  .strict();

const GridMistake = z
  .object({
    label: z.string().min(3),
    category: Category,
    sheet: z.string().optional(), // defaults to the first sheet
    /** cell -> the wrong formula a student might enter there */
    cells: z.record(CellAddress, Formula),
  })
  .strict();

const Grid = z
  .object({
    ...base,
    type: z.literal('grid'),
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(),
    /** Grid answers are formulas, so the default is tight: within 0.1%. */
    tolerance: Tolerance.default({ pct: 0.001 }),
    /**
     * Extra input sets the grader always tests, on top of the random ones.
     * Use them for threshold logic (IF / MIN / MAX / lookups) where a random
     * change might not cross the threshold. Keys are input cells on the first
     * sheet ("B7") or "Sheet!B7"; cells not listed keep their base value.
     */
    edgeCases: z.array(z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))).default([]),
    mistakes: z.array(GridMistake).min(1),
    explanation: z.string().min(3),
  })
  .strict();

// ---- write-the-formula: a mini sheet with exactly one yellow cell ---------

const FormulaItem = z
  .object({
    ...base,
    type: z.literal('formula'),
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(), // must contain exactly one target
    tolerance: Tolerance.default({ pct: 0.001 }),
    edgeCases: z.array(z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))).default([]),
    mistakes: z.array(GridMistake).min(1),
    explanation: z.string().min(3),
  })
  .strict();

// ---- error hunt: a finished model with planted bugs ------------------------

/** One logical bug. It may span several cells (e.g. a bad formula that was filled right). */
const Bug = z
  .object({
    label: z.string().min(3), // shown after grading: what was wrong and how to fix it
    category: Category,
    sheet: z.string().optional(),
    /** cell -> what the student sees there instead of the model solution (a wrong formula or a typed number) */
    cells: z.record(CellAddress, z.string().min(1)),
  })
  .strict();

const ErrorHunt = z
  .object({
    ...base,
    type: z.literal('errorhunt'),
    /** Every `target` cell is shown filled in with its solution, except the bug cells. */
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(),
    tolerance: Tolerance.default({ pct: 0.001 }),
    edgeCases: z.array(z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))).default([]),
    bugs: z.array(Bug).min(1).max(4),
    explanation: z.string().min(3),
  })
  .strict();

// ---- guided case: the same model three ways (worked -> partly filled -> blank)

const CaseStep = z
  .object({
    title: z.string().min(2),
    /** The reasoning for this step, shown beside the sheet. */
    text: z.string().min(3),
    sheet: z.string().optional(),
    /** The yellow cells this step fills in. */
    cells: z.array(CellAddress).min(1),
  })
  .strict();

const CaseItem = z
  .object({
    ...base,
    type: z.literal('case'),
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(),
    tolerance: Tolerance.default({ pct: 0.001 }),
    edgeCases: z.array(z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))).default([]),
    mistakes: z.array(GridMistake).min(1),
    /** In order. Together the steps must cover every target cell exactly once. */
    steps: z.array(CaseStep).min(2),
    explanation: z.string().min(3),
  })
  .strict();

// ---- timed challenge: a grid build against the clock, no hints -------------

const Timed = z
  .object({
    ...base,
    type: z.literal('timed'),
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(),
    tolerance: Tolerance.default({ pct: 0.001 }),
    edgeCases: z.array(z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))).default([]),
    mistakes: z.array(GridMistake).min(1),
    /** Time allowed. The sheet is graded automatically when it runs out. */
    minutes: z.number().positive(),
    /** Score needed to pass, 0..1. */
    passMark: z.number().min(0).max(1).default(0.8),
    /** The requirements, as a short checklist shown beside the sheet. */
    brief: z.array(z.string()).default([]),
    explanation: z.string().min(3),
  })
  .strict();

// ---- predict, then check ---------------------------------------------------

const CellRef = z.object({ sheet: z.string().optional(), cell: CellAddress }).strict();

const Predict = z
  .object({
    ...base,
    type: z.literal('predict'),
    /** A finished model: labels, inputs and given formulas only (no targets). */
    workbook: z.object({ sheets: z.array(Sheet).min(1) }).strict(),
    /** The result the student predicts. */
    output: CellRef.extend({ label: z.string().min(2), format: Format }).strict(),
    /** The change applied to one input: add to it, multiply it, or set it. Give exactly one. */
    shock: CellRef.extend({
      label: z.string().min(3), // e.g. "The exit cap rate rises 50 bps"
      add: z.number().optional(),
      mult: z.number().optional(),
      set: z.number().optional(),
    }).strict(),
    /** How the size of the change is estimated: 'pct' = % change, 'abs' = change in the output's own units. */
    measure: z.enum(['pct', 'abs']).default('pct'),
    /** The estimate counts if it is within this fraction of the true change (0.35 = within 35%). */
    band: z.number().positive().default(0.35),
    /** The intuition: why it moves that way and roughly that much. */
    explanation: z.string().min(3),
    /** The tempting wrong intuition, shown when the direction is wrong. */
    trap: z.string().min(3),
  })
  .strict();

// ---- estimate first: ballpark, then exact ----------------------------------

const Estimate = z
  .object({
    ...base,
    type: z.literal('estimate'),
    vars: z.array(Variable).min(1),
    answer: Formula,
    format: Format,
    unit: z.string().optional(),
    /** The ballpark counts if it is within this fraction of the answer (0.2 = within 20%). */
    ballpark: z.number().positive().default(0.2),
    tolerance: Tolerance.default({ pct: 0.005 }),
    mistakes: z.array(NumericMistake).min(1),
    /** The mental-math route to a ballpark. */
    shortcut: z.string().min(3),
    explanation: z.string().min(3),
  })
  .strict();

// ---- ordering ----------------------------------------------------------------

const Order = z
  .object({
    ...base,
    type: z.literal('order'),
    /** The lines in the CORRECT order. They are shuffled for the student. */
    lines: z.array(z.string().min(1)).min(3).max(10),
    /** The slip people usually make with this sequence. */
    trap: z.string().min(3),
    explanation: z.string().min(3),
  })
  .strict();

// ---- explain why (self-graded against a rubric) -----------------------------

const Explain = z
  .object({
    ...base,
    type: z.literal('explain'),
    /** The points a good answer makes. The student ticks the ones they covered. */
    rubric: z.array(z.string().min(3)).min(2).max(6),
    /** A model 2-3 sentence answer. */
    model: z.string().min(10),
    /** What weak answers usually get wrong or leave out. */
    trap: z.string().min(3),
  })
  .strict();

// ---- go / no-go --------------------------------------------------------------

const GoNoGo = z
  .object({
    ...base,
    type: z.literal('gonogo'),
    vars: z.array(Variable).min(1),
    /** The outputs shown to the student. */
    metrics: z
      .array(z.object({ label: z.string().min(2), value: Formula, format: Format }).strict())
      .min(2)
      .max(8),
    /** The investment tests. The deal is a Go only if every one passes. */
    criteria: z
      .array(
        z
          .object({
            label: z.string().min(3), // e.g. "Development spread of at least 150 bps"
            pass: Formula, // TRUE when the test is met
            note: z.string().min(3), // one line on how to check it; may use {templates}
          })
          .strict(),
      )
      .min(2)
      .max(5),
    explanation: z.string().min(3),
  })
  .strict();

// ---- shortcut drill ----------------------------------------------------------

const Shortcut = z
  .object({
    ...base,
    type: z.literal('shortcut'),
    /** Keys are written like "Ctrl+R", "Cmd+Shift+L", "F2", "Alt+=". A sequence uses commas: "Alt,H,O,I". */
    drills: z
      .array(z.object({ action: z.string().min(3), mac: z.string().min(1), win: z.string().min(1) }).strict())
      .min(4)
      .max(12),
    /** Target time for the whole set, in seconds. */
    seconds: z.number().positive().default(60),
    explanation: z.string().optional(),
  })
  .strict();


// ============================================================================
// Question types added for the non-Excel categories. The core course does not
// use them (its 14 types and their labels below are unchanged).
// ============================================================================

// ---- scenario judgment: pick the best response; every option is explained ----

const Judgment = z
  .object({
    ...base,
    type: z.literal('judgment'),
    vars: z.array(Variable).default([]),
    /** Exactly one option is rated 'best' (full credit). 'acceptable' earns half, 'poor' none. */
    options: z
      .array(
        z
          .object({
            text: z.string().min(3),
            rating: z.enum(['best', 'acceptable', 'poor']),
            /** Why this response is rated the way it is. Shown for every option after grading. */
            why: z.string().min(3),
            category: Category.optional(),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    explanation: z.string().min(3),
  })
  .strict();

// ---- document review: flag the lines of a document that contain a problem ----

const DocLine = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    /** The line, or its first column when the document is a table. May use {templates}. */
    text: z.string().min(1),
    /** Remaining columns when the document has `columns`. May use {templates}. */
    cells: z.array(z.string()).optional(),
    /** A heading or total: shown, but cannot be flagged. */
    heading: z.boolean().optional(),
  })
  .strict();

const DocReview = z
  .object({
    ...base,
    type: z.literal('docreview'),
    vars: z.array(Variable).default([]),
    document: z
      .object({
        /** e.g. "Trailing-12 operating statement" */
        kind: z.string().min(3),
        title: z.string().min(3),
        /** Column headings, first column included. Leave out for a document of paragraphs or clauses. */
        columns: z.array(z.string()).optional(),
        lines: z.array(DocLine).min(4).max(40),
      })
      .strict(),
    /** The problems. Flagging any one of an issue's lines finds it. Lines must not be shared between issues. */
    issues: z
      .array(
        z
          .object({
            lines: z.array(z.string()).min(1),
            /** What is wrong and what to do about it. May use {templates}. */
            label: z.string().min(3),
            category: Category,
          })
          .strict(),
      )
      .min(1)
      .max(5),
    explanation: z.string().min(3),
  })
  .strict();

// ---- plan reading: answer by clicking, measuring or reading a generated drawing ----

/** A key that matches a plan element by its exact id ("unit-203") or by its role ("stair"). */
const ElementKey = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const PlanTask = z.discriminatedUnion('kind', [
  // click the right thing on the drawing
  z
    .object({
      kind: z.literal('locate'),
      /** Any element matching one of these keys is correct. */
      targets: z.array(ElementKey).min(1),
      /** Tempting wrong clicks, each with its own feedback. */
      decoys: z.array(z.object({ match: ElementKey, why: z.string().min(3), category: Category }).strict()).default([]),
    })
    .strict(),
  // read, measure or compute a number from the drawing; the key is a formula over the plan's facts
  z
    .object({
      kind: z.literal('measure'),
      answer: Formula,
      format: Format,
      unit: z.string().optional(),
      tolerance: Tolerance.default({ pct: 0.02 }),
      /** The ruler: real-world feet, inches on paper (the student applies the scale), or none. */
      tool: z.enum(['real', 'paper', 'none']).default('real'),
      mistakes: z.array(NumericMistake).min(1),
    })
    .strict(),
  // name the highlighted element or symbol
  z
    .object({
      kind: z.literal('identify'),
      highlight: ElementKey,
      correct: z.string().min(1),
      distractors: z
        .array(z.object({ text: z.string().min(1), why: z.string().min(3), category: Category }).strict())
        .min(2)
        .max(4),
    })
    .strict(),
]);

const PlanItem = z
  .object({
    ...base,
    type: z.literal('plan'),
    plan: z
      .object({
        /** A plan set id from src/plans/sets.ts. */
        set: z.string().min(1),
        /** Parameter sets for the generator. One is chosen per attempt, so the drawing and the answer change. */
        variants: z.array(z.record(z.string(), z.number())).min(1),
        /** The sheet shown first, e.g. "A-201". */
        sheet: z.string().min(1),
      })
      .strict(),
    task: PlanTask,
    explanation: z.string().min(3),
  })
  .strict();

// ---- lease simulator: answer from, or by editing, a generated lease-by-lease cash flow ----

const RecoveryType = z.enum(['nnn', 'gross', 'base-year', 'stop']);

const LeaseTenant = z
  .object({
    id: ElementKey, // e.g. "suite-200"
    name: z.string().min(2),
    sf: z.number().positive(),
    /** Analysis year the current lease began: 1 = with the analysis, 0 or negative = already in place. */
    startYear: z.number().int().max(1),
    /** Last year of the current lease, inclusive. 0 = vacant when the analysis starts. */
    endYear: z.number().int().min(0),
    baseRent: z.number().min(0),
    escalation: z.number().min(0).max(0.2),
    recovery: RecoveryType,
    baseYearExpenses: z.number().positive().optional(),
    stopPsf: z.number().positive().optional(),
  })
  .strict();

const LeaseScenario = z
  .object({
    building: z
      .object({
        sf: z.number().positive(),
        expensesYear1: z.number().positive(),
        expenseGrowth: z.number(),
        generalVacancy: z.number().min(0).max(0.5),
        creditLoss: z.number().min(0).max(0.2),
        reserves: z.number().min(0),
      })
      .strict(),
    tenants: z.array(LeaseTenant).min(1).max(8),
    mla: z
      .object({
        marketRent: z.number().positive(),
        marketGrowth: z.number(),
        renewalProbability: z.number().min(0).max(1),
        downtimeMonths: z.number().min(0).max(12),
        termYears: z.number().int().min(1).max(15),
        escalation: z.number().min(0).max(0.2),
        tiNew: z.number().min(0),
        tiRenew: z.number().min(0),
        lcNew: z.number().min(0).max(0.2),
        lcRenew: z.number().min(0).max(0.2),
        freeNew: z.number().min(0).max(12),
        freeRenew: z.number().min(0).max(12),
        recovery: RecoveryType,
      })
      .strict(),
    /** Years shown. One more year is projected behind the scenes for the resale. */
    years: z.number().int().min(3).max(10),
    valuation: z.object({ discount: z.number().positive(), exitCap: z.number().positive(), saleCost: z.number().min(0).max(0.2) }).strict().optional(),
  })
  .strict();

/** A numeric input of the scenario: "building.expensesYear1", "mla.renewalProbability", "tenants.suite-200.baseRent". */
const LeasePath = z.string().regex(/^(building|mla)\.[A-Za-z0-9]+$|^tenants\.[a-z0-9]+(-[a-z0-9]+)*\.[A-Za-z]+$/, 'paths look like "mla.tiNew" or "tenants.suite-200.baseRent"');

const LeaseTask = z.discriminatedUnion('kind', [
  // read or compute a number from the generated report; the key is a formula over the report's facts
  z
    .object({
      kind: z.literal('read'),
      answer: Formula,
      format: Format,
      unit: z.string().optional(),
      tolerance: Tolerance.default({ pct: 0.005 }),
      mistakes: z.array(NumericMistake).min(1),
    })
    .strict(),
  // edit the inputs until the generated cash flow matches the one the correct inputs produce
  z
    .object({
      kind: z.literal('configure'),
      /** The correct value of every input the student has to change (hidden until graded). */
      target: z.record(LeasePath, z.number()),
      /** The report lines that are compared with the key. Score = share that match. */
      checks: z.array(z.object({ fact: VarName, label: z.string().min(3) }).strict()).min(1).max(8),
      tolerance: Tolerance.default({ pct: 0.001 }),
    })
    .strict(),
  // predict what a change to one input does to one output, then watch it happen
  z
    .object({
      kind: z.literal('shock'),
      change: z.object({ path: LeasePath, set: z.number(), label: z.string().min(3) }).strict(),
      output: z.object({ fact: VarName, label: z.string().min(3), format: Format }).strict(),
      /** The size estimate counts if it is within this fraction of the true % change. */
      band: z.number().positive().default(0.35),
      /** The tempting wrong intuition. */
      trap: z.string().min(3),
    })
    .strict(),
]);

const LeaseSim = z
  .object({
    ...base,
    type: z.literal('leasesim'),
    scenario: LeaseScenario,
    /** Input overrides, one set chosen per attempt, e.g. [{ "mla.marketRent": 44 }]. Empty = always the scenario as written. */
    variants: z.array(z.record(LeasePath, z.number())).default([]),
    /** Inputs the student may edit. Everything else is locked. */
    editable: z.array(LeasePath).default([]),
    task: LeaseTask,
    explanation: z.string().min(3),
  })
  .strict();

export const ItemSchema = z.discriminatedUnion('type', [
  Flashcard,
  Mcq,
  Numeric,
  Grid,
  FormulaItem,
  ErrorHunt,
  CaseItem,
  Timed,
  Predict,
  Estimate,
  Order,
  Explain,
  GoNoGo,
  Shortcut,
  Judgment,
  DocReview,
  PlanItem,
  LeaseSim,
]);

export type Item = z.infer<typeof ItemSchema>;
/** What you write in a content file (fields with defaults are optional). */
export type ItemInput = z.input<typeof ItemSchema>;
export type ItemType = Item['type'];

export type FlashcardItem = Extract<Item, { type: 'flashcard' }>;
export type McqItem = Extract<Item, { type: 'mcq' }>;
export type NumericItem = Extract<Item, { type: 'numeric' }>;
export type GridItem = Extract<Item, { type: 'grid' }>;
export type FormulaQItem = Extract<Item, { type: 'formula' }>;
export type ErrorHuntItem = Extract<Item, { type: 'errorhunt' }>;
export type CaseQItem = Extract<Item, { type: 'case' }>;
export type TimedItem = Extract<Item, { type: 'timed' }>;
export type PredictItem = Extract<Item, { type: 'predict' }>;
export type EstimateItem = Extract<Item, { type: 'estimate' }>;
export type OrderItem = Extract<Item, { type: 'order' }>;
export type ExplainItem = Extract<Item, { type: 'explain' }>;
export type GoNoGoItem = Extract<Item, { type: 'gonogo' }>;
export type ShortcutItem = Extract<Item, { type: 'shortcut' }>;
export type JudgmentItem = Extract<Item, { type: 'judgment' }>;
export type DocReviewItem = Extract<Item, { type: 'docreview' }>;
export type PlanQItem = Extract<Item, { type: 'plan' }>;
export type LeaseSimItem = Extract<Item, { type: 'leasesim' }>;
export type LeaseScenarioSpec = z.infer<typeof LeaseScenario>;
export type GridMistakeSpec = z.infer<typeof GridMistake>;
export type BugSpec = z.infer<typeof Bug>;

/** Item types whose answer is a filled-in sheet graded by the grid grader. */
export type SheetGradedItem = GridItem | FormulaQItem | CaseQItem | TimedItem;
export const SHEET_GRADED_TYPES: ItemType[] = ['grid', 'formula', 'case', 'timed'];
/** Item types that contain a workbook at all. */
export const WORKBOOK_TYPES: ItemType[] = ['grid', 'formula', 'case', 'timed', 'errorhunt', 'predict'];

/** The types used only outside the core course. */
export type CategoryOnlyType = 'judgment' | 'docreview' | 'plan' | 'leasesim';
export type CoreItemType = Exclude<ItemType, CategoryOnlyType>;

/** The core course's 14 types. */
export const ITEM_TYPE_LABELS: Record<CoreItemType, string> = {
  flashcard: 'Flashcard',
  mcq: 'Multiple choice',
  numeric: 'Calculation',
  grid: 'Grid build',
  formula: 'Write the formula',
  errorhunt: 'Error hunt',
  case: 'Guided case',
  timed: 'Timed challenge',
  predict: 'Predict, then check',
  estimate: 'Estimate first',
  order: 'Put in order',
  explain: 'Explain why',
  gonogo: 'Go / no-go',
  shortcut: 'Shortcut drill',
};

/** Every type, core and category-only. Use this one for display. */
export const ALL_TYPE_LABELS: Record<ItemType, string> = {
  ...ITEM_TYPE_LABELS,
  judgment: 'Scenario judgment',
  docreview: 'Document review',
  plan: 'Plan reading',
  leasesim: 'Lease simulator',
};

/** Types that show a spreadsheet or drawing, or need a real keyboard, so they are left out of phone-friendly sessions. */
export const DESKTOP_ONLY_TYPES: ItemType[] = ['grid', 'errorhunt', 'case', 'timed', 'shortcut', 'formula', 'predict', 'plan', 'leasesim'];
