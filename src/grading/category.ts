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

/**
 * An element together with the sheet it is on. Element ids repeat between
 * sheets (every sheet has a "drawing-title"), so a click is always recorded
 * as "<sheet>/<element id>".
 */
export interface Placed {
  key: string;
  sheet: string;
  el: PlanElement;
}

export const placedKey = (sheet: string, id: string): string => `${sheet}/${id}`;

/** Every clickable element of the set, with its key. */
export function placedElements(set: PlanSet): Placed[] {
  return set.sheets.flatMap((s) => s.elements.filter((e) => e.hit).map((el) => ({ key: placedKey(s.id, el.id), sheet: s.id, el })));
}

export function findPlaced(set: PlanSet, key: string): Placed | undefined {
  return placedElements(set).find((p) => p.key === key);
}

/** Every clickable element that matches one of the question keys (an element id or a role), in the whole set or on one sheet. */
export function matchingPlaced(set: PlanSet, keys: readonly string[], onSheet?: string): Placed[] {
  return placedElements(set).filter((p) => (!onSheet || p.sheet === onSheet) && keys.some((k) => elementMatches(p.el, k)));
}

export function matchingElements(set: PlanSet, keys: readonly string[], onSheet?: string): PlanElement[] {
  return matchingPlaced(set, keys, onSheet).map((p) => p.el);
}

/** The elements a locate task accepts. */
export function locateTargets(item: PlanQItem, set: PlanSet): Placed[] {
  if (item.task.kind !== 'locate') throw new Error(`${item.id} is not a locate task`);
  return matchingPlaced(set, item.task.targets, item.task.onSheet);
}

export interface LocateResult {
  correct: boolean;
  message: string;
  category?: MistakeCategory;
  /** What the student clicked, in words. */
  picked: string;
}

/** Grade one click, given as "<sheet>/<element id>". */
export function gradeLocate(item: PlanQItem, set: PlanSet, key: string | null): LocateResult {
  if (item.task.kind !== 'locate') throw new Error(`${item.id} is not a locate task`);
  const hit = key ? findPlaced(set, key) : undefined;
  if (!hit) return { correct: false, message: 'Nothing was selected.', category: 'incomplete', picked: '(nothing)' };
  if (locateTargets(item, set).some((t) => t.key === hit.key)) return { correct: true, message: '', picked: hit.el.name };
  const decoy = item.task.decoys.find((d) => elementMatches(hit.el, d.match));
  if (decoy) return { correct: false, message: decoy.why, category: decoy.category, picked: hit.el.name };
  return { correct: false, message: `You clicked: ${hit.el.name}.`, category: 'concept', picked: hit.el.name };
}

export interface LocateManyResult {
  /** (right picks - wrong picks) / picks needed, between 0 and 1. */
  score: number;
  right: string[];
  wrong: string[];
  /** Feedback for the first wrong pick, if any. */
  message: string;
  category?: MistakeCategory;
  picked: string;
}

/** "Click all three": every pick is checked, and a wrong pick cancels a right one. Picks are "<sheet>/<element id>" keys. */
export function gradeLocateMany(item: PlanQItem, set: PlanSet, keys: readonly string[]): LocateManyResult {
  if (item.task.kind !== 'locate') throw new Error(`${item.id} is not a locate task`);
  const picks = [...new Set(keys)];
  const right: string[] = [];
  const wrong: string[] = [];
  let message = '';
  let category: MistakeCategory | undefined;
  for (const key of picks) {
    const res = gradeLocate(item, set, key);
    if (res.correct) right.push(key);
    else {
      wrong.push(key);
      if (!message) {
        message = res.message;
        category = res.category;
      }
    }
  }
  const need = item.task.pick;
  const score = Math.max(0, Math.min(1, (Math.min(right.length, need) - wrong.length) / need));
  if (!message && right.length < need) {
    message = picks.length === 0 ? 'Nothing was selected.' : `You found ${right.length} of ${need}.`;
    category = 'incomplete';
  }
  return { score, right, wrong, message, category, picked: picks.map((k) => findPlaced(set, k)?.el.name ?? k).join('; ') || '(nothing)' };
}

export interface SheetOption {
  sheet: string;
  correct: boolean;
}

/** The sheets offered in a navigate task: every sheet of the set plus any distractors, shuffled. */
export function navigateOptions(item: PlanQItem, set: PlanSet, rng: Rng): SheetOption[] {
  if (item.task.kind !== 'navigate') throw new Error(`${item.id} is not a navigate task`);
  const t = item.task;
  const ids = [...new Set([...set.sheets.map((s) => s.id), ...t.distractorSheets])];
  return shuffle(rng, ids.map((sheet) => ({ sheet, correct: sheet === t.correctSheet })));
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
