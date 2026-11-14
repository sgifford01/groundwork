/**
 * Grading for the three question types used outside the core course:
 * scenario judgment, document review and plan reading. No UI code here, so
 * the tests can call these directly.
 */
import type { DocReviewItem, JudgmentItem, MistakeCategory, NumericItem, PlanQItem } from '../content/schema';
import { seededRng, shuffle, type Rng } from '../engine/rng';
import { renderTemplate, sampleVars, type VarValues } from '../engine/variables';
import { elementMatches, type PlanElement, type PlanSet } from '../plans/model';
import { buildPlanSet } from '../plans/sets';
import { gradeNumeric, type NumericResult } from './simple';

// ---- scenario judgment -------------------------------------------------------

export const JUDGMENT_SCORE = { best: 1, acceptable: 0.5, poor: 0 } as const;
export const JUDGMENT_LABEL = { best: 'Best response', acceptable: 'Workable, but not the best', poor: 'Poor response' } as const;

export interface JudgmentOption {
  text: string;
  rating: 'best' | 'acceptable' | 'poor';
  why: string;
  category?: MistakeCategory;
}

/** The options for one attempt: templates filled in, order shuffled. */
export function judgmentOptions(item: JudgmentItem, values: VarValues, rng: Rng): JudgmentOption[] {
  return shuffle(
    rng,
    item.options.map((o) => ({
      text: renderTemplate(o.text, values, item.vars),
      rating: o.rating,
      why: renderTemplate(o.why, values, item.vars),
      category: o.category,
    })),
  );
}

// ---- document review ---------------------------------------------------------

export interface DocReviewResult {
  /** (issues found - lines flagged wrongly) / issues, never below 0. */
  score: number;
  /** One entry per issue, in the item's order. */
  found: boolean[];
  /** Flagged lines that belong to no issue. */
  falseFlags: string[];
}

export function gradeDocReview(item: DocReviewItem, flagged: readonly string[]): DocReviewResult {
  const flags = new Set(flagged);
  const found = item.issues.map((issue) => issue.lines.some((l) => flags.has(l)));
  const issueLines = new Set(item.issues.flatMap((i) => i.lines));
  const falseFlags = [...flags].filter((l) => !issueLines.has(l));
  const hits = found.filter(Boolean).length;
  return { score: Math.max(0, (hits - falseFlags.length) / item.issues.length), found, falseFlags };
}

/** A document with its {templates} filled in for one attempt. */
export function renderDocument(item: DocReviewItem, seed: number) {
  const values = sampleVars(item.vars, seededRng(item.id, seed));
  const fill = (s: string) => renderTemplate(s, values, item.vars);
  return {
    values,
    lines: item.document.lines.map((l) => ({ ...l, text: fill(l.text), cells: (l.cells ?? []).map(fill) })),
    issues: item.issues.map((i) => ({ ...i, label: fill(i.label) })),
  };
}

// ---- plan reading --------------------------------------------------------------

/** The drawing for one attempt: the seed picks one of the item's parameter variants. */
export function planFor(item: PlanQItem, seed: number): PlanSet {
  const rng = seededRng(item.id, seed);
  const variant = item.plan.variants[Math.floor(rng() * item.plan.variants.length)];
  return buildPlanSet(item.plan.set, variant);
}

export function findElement(set: PlanSet, id: string): PlanElement | undefined {
  for (const sheet of set.sheets) {
    const el = sheet.elements.find((e) => e.id === id);
    if (el) return el;
  }
  return undefined;
}

/** Every clickable element in the set that matches one of the keys. */
export function matchingElements(set: PlanSet, keys: readonly string[]): PlanElement[] {
  return set.sheets.flatMap((s) => s.elements.filter((e) => e.hit && keys.some((k) => elementMatches(e, k))));
}

export interface LocateResult {
  correct: boolean;
  message: string;
  category?: MistakeCategory;
  /** What the student clicked, in words. */
  picked: string;
}

export function gradeLocate(item: PlanQItem, set: PlanSet, elementId: string | null): LocateResult {
  if (item.task.kind !== 'locate') throw new Error(`${item.id} is not a locate task`);
  if (!elementId) return { correct: false, message: 'Nothing was selected.', category: 'incomplete', picked: '(nothing)' };
  const el = findElement(set, elementId);
  if (!el) return { correct: false, message: 'Nothing was selected.', category: 'incomplete', picked: '(nothing)' };
  if (item.task.targets.some((k) => elementMatches(el, k))) return { correct: true, message: '', picked: el.name };
  const decoy = item.task.decoys.find((d) => elementMatches(el, d.match));
  if (decoy) return { correct: false, message: decoy.why, category: decoy.category, picked: el.name };
  return { correct: false, message: `You clicked: ${el.name}.`, category: 'concept', picked: el.name };
}

/** A measure task is graded exactly like a numeric question whose variables are the plan's facts. */
export function gradeMeasure(item: PlanQItem, set: PlanSet, typed: string): NumericResult {
  if (item.task.kind !== 'measure') throw new Error(`${item.id} is not a measure task`);
  const t = item.task;
  const pseudo = { ...item, type: 'numeric', vars: [], answer: t.answer, format: t.format, unit: t.unit, tolerance: t.tolerance, mistakes: t.mistakes } as unknown as NumericItem;
  return gradeNumeric(pseudo, set.facts, typed);
}

export interface IdentifyOption {
  text: string;
  correct: boolean;
  why?: string;
  category?: MistakeCategory;
}

export function identifyOptions(item: PlanQItem, rng: Rng): IdentifyOption[] {
  if (item.task.kind !== 'identify') throw new Error(`${item.id} is not an identify task`);
  return shuffle(rng, [
    { text: item.task.correct, correct: true },
    ...item.task.distractors.map((d) => ({ text: d.text, correct: false, why: d.why, category: d.category })),
  ]);
}
