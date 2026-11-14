/**
 * The machine-checked parts of each category's BUILD_SPEC.md.
 *
 * Every category folder has a spec-data.ts exporting SPEC: worked examples
 * (inputs plus formulas), the planned question-type mix and the build chunks.
 * `npm run sync-specs` renders them into the marked blocks of BUILD_SPEC.md,
 * evaluating every formula with the app's own engine, so no number in a spec
 * is typed by hand. tests/categories.test.ts fails if a spec is out of date,
 * if an example does not evaluate, or if counts do not add up to the target.
 */
import { formatValue, isCellError, type NumFormat, type Scalar } from '../../engine/format';
import { evalFormula } from '../../engine/workbook';
import { ALL_TYPE_LABELS, type ItemType } from '../schema';
import { CATEGORY_LEVELS, type Category } from './registry';

export interface WorkedExample {
  id: string;
  title: string;
  /** The definition or rule the example illustrates, in a sentence or two. */
  concept: string;
  given: { name: string; label: string; value: number; format: NumFormat }[];
  /** Evaluated in order; each step can use the givens and earlier steps by name. */
  steps: { name: string; label: string; formula: string; format: NumFormat }[];
  /** What to notice, or the trap. */
  note?: string;
}

export interface SpecData {
  examples: WorkedExample[];
  /**
   * How many questions of each type the finished category has. Must add up to the target.
   * A key that is not yet an item type (e.g. "leasesim") is a type the builder adds; section 13 of the spec defines it.
   */
  typeMix: Record<string, number>;
  /** One chunk per build session. Item counts must add up to the target (seeds included). */
  chunks: { title: string; items: number; scope: string }[];
}

export interface SolvedExample extends WorkedExample {
  values: Record<string, number>;
}

/** Evaluate an example. Throws if any step is not a finite number. */
export function solveExample(ex: WorkedExample): SolvedExample {
  const scope: Record<string, Scalar> = {};
  for (const g of ex.given) scope[g.name] = g.value;
  const values: Record<string, number> = {};
  for (const step of ex.steps) {
    const v = evalFormula(step.formula, scope);
    if (isCellError(v) || typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`Worked example "${ex.id}", step "${step.name}": ${step.formula} did not give a number`);
    }
    scope[step.name] = v;
    values[step.name] = v;
  }
  return { ...ex, values };
}

const cell = (s: string) => s.replace(/\|/g, '\\|');

export function renderExamples(data: SpecData): string {
  const out: string[] = [];
  data.examples.forEach((raw, i) => {
    const ex = solveExample(raw);
    out.push(`#### Example ${i + 1}: ${ex.title} (\`${ex.id}\`)`, '', ex.concept, '');
    out.push('| Given | Name | Value |', '|---|---|---:|');
    for (const g of ex.given) out.push(`| ${cell(g.label)} | \`${g.name}\` | ${formatValue(g.value, g.format)} |`);
    out.push('', '| Step | Name | Formula | Result |', '|---|---|---|---:|');
    for (const s of ex.steps) out.push(`| ${cell(s.label)} | \`${s.name}\` | \`${cell(s.formula)}\` | ${formatValue(ex.values[s.name], s.format)} |`);
    if (ex.note) out.push('', `*Note.* ${ex.note}`);
    out.push('');
  });
  return out.join('\n').trimEnd();
}

export function renderSubtopics(cat: Category): string {
  const out = ['| Subtopic id | Name | Level | Target items | Covers |', '|---|---|---|---:|---|'];
  for (const t of cat.subtopics) out.push(`| \`${t.id}\` | ${t.name} | ${t.level} ${CATEGORY_LEVELS[t.level]} | ${t.target} | ${cell(t.blurb)} |`);
  out.push(`| | **Total** | | **${cat.subtopics.reduce((n, t) => n + t.target, 0)}** | |`);
  return out.join('\n');
}

export function renderTypeMix(data: SpecData): string {
  const out = ['| Question type | `type` | Count |', '|---|---|---:|'];
  let total = 0;
  for (const [type, n] of Object.entries(data.typeMix)) {
    const label = ALL_TYPE_LABELS[type as ItemType] ?? 'NEW TYPE to build (see section 13)';
    out.push(`| ${label} | \`${type}\` | ${n} |`);
    total += n;
  }
  out.push(`| **Total** | | **${total}** |`);
  return out.join('\n');
}

export function renderChunks(data: SpecData): string {
  const out = ['| Chunk | Items | Scope |', '|---|---:|---|'];
  let total = 0;
  data.chunks.forEach((c) => {
    out.push(`| ${cell(c.title)} | ${c.items} | ${cell(c.scope)} |`);
    total += c.items;
  });
  out.push(`| **Total** | **${total}** | |`);
  return out.join('\n');
}

export const SPEC_BLOCKS = ['SUBTOPICS', 'EXAMPLES', 'TYPEMIX', 'CHUNKS'] as const;

export function renderBlock(block: (typeof SPEC_BLOCKS)[number], cat: Category, data: SpecData): string {
  if (block === 'SUBTOPICS') return renderSubtopics(cat);
  if (block === 'EXAMPLES') return renderExamples(data);
  if (block === 'TYPEMIX') return renderTypeMix(data);
  return renderChunks(data);
}

/** Replace the generated blocks of a BUILD_SPEC.md. Throws if a marker pair is missing. */
export function syncSpec(markdown: string, cat: Category, data: SpecData): string {
  let out = markdown;
  for (const block of SPEC_BLOCKS) {
    const start = `<!-- ${block}:START (generated by npm run sync-specs; do not edit by hand) -->`;
    const end = `<!-- ${block}:END -->`;
    const a = out.indexOf(start);
    const b = out.indexOf(end);
    if (a < 0 || b < 0 || b < a) throw new Error(`${cat.slug}/BUILD_SPEC.md is missing the ${block} markers`);
    out = `${out.slice(0, a + start.length)}\n${renderBlock(block, cat, data)}\n${out.slice(b)}`;
  }
  return out;
}

const modules = import.meta.glob<{ SPEC?: SpecData }>('./*/spec-data.ts', { eager: true });

/** slug -> spec data, for every category folder that has a spec-data.ts. */
export const SPEC_DATA: Record<string, SpecData> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => {
    if (!mod.SPEC) throw new Error(`${path} must export SPEC`);
    return [path.split('/')[1], mod.SPEC];
  }),
);
