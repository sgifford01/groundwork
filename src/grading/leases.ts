/**
 * Grading for lease simulator questions. No UI code.
 *
 * A scenario (building, tenants, market leasing assumptions) goes through the
 * lease engine; the report's numbers come back as named facts. Questions are
 * keyed against those facts, never against typed-in numbers.
 */
import type { LeaseScenarioSpec, LeaseSimItem, NumericItem } from '../content/schema';
import { seededRng } from '../engine/rng';
import { facts, projectCashFlow, type CashFlowYear } from '../leases/engine';
import { gradeNumeric, type NumericResult } from './simple';

export type LeaseScenario = LeaseScenarioSpec;

/** Read a numeric input by path, e.g. "mla.tiNew" or "tenants.suite-200.baseRent". Undefined if there is no such number. */
export function getPath(s: LeaseScenario, path: string): number | undefined {
  const parts = path.split('.');
  let node: unknown;
  if (parts[0] === 'tenants') node = s.tenants.find((t) => t.id === parts[1]);
  else node = parts[0] === 'building' ? s.building : parts[0] === 'mla' ? s.mla : undefined;
  const field = parts[parts.length - 1];
  const value = node && typeof node === 'object' ? (node as Record<string, unknown>)[field] : undefined;
  return typeof value === 'number' ? value : undefined;
}

/** A copy of the scenario with one numeric input changed. Throws on a path that is not a number in the scenario. */
export function setPath(s: LeaseScenario, path: string, value: number): LeaseScenario {
  if (getPath(s, path) === undefined) throw new Error(`"${path}" is not a numeric input of this scenario`);
  const parts = path.split('.');
  const field = parts[parts.length - 1];
  if (parts[0] === 'tenants') return { ...s, tenants: s.tenants.map((t) => (t.id === parts[1] ? { ...t, [field]: value } : t)) };
  if (parts[0] === 'building') return { ...s, building: { ...s.building, [field]: value } };
  return { ...s, mla: { ...s.mla, [field]: value } };
}

export function applyPaths(s: LeaseScenario, changes: Record<string, number>): LeaseScenario {
  return Object.entries(changes).reduce((acc, [path, value]) => setPath(acc, path, value), s);
}

/** The starting scenario for one attempt: the seed picks one of the item's variants. */
export function scenarioFor(item: LeaseSimItem, seed: number): LeaseScenario {
  if (item.variants.length === 0) return item.scenario;
  const rng = seededRng(item.id, seed);
  return applyPaths(item.scenario, item.variants[Math.floor(rng() * item.variants.length)]);
}

export interface LeaseRun {
  /** One more year than the scenario shows: the extra year feeds the resale. */
  cf: CashFlowYear[];
  facts: Record<string, number>;
}

export function runScenario(s: LeaseScenario): LeaseRun {
  const cf = projectCashFlow(s.building, s.tenants, s.mla, s.years + 1);
  return { cf, facts: facts(cf, s.years, s.valuation) };
}

/** A read task is graded exactly like a numeric question whose variables are the report's facts. */
export function gradeLeaseRead(item: LeaseSimItem, run: LeaseRun, typed: string): NumericResult {
  if (item.task.kind !== 'read') throw new Error(`${item.id} is not a read task`);
  const t = item.task;
  const pseudo = { ...item, type: 'numeric', vars: [], answer: t.answer, format: t.format, unit: t.unit, tolerance: t.tolerance, mistakes: t.mistakes } as unknown as NumericItem;
  return gradeNumeric(pseudo, run.facts, typed);
}

function near(x: number, target: number, tol: { pct?: number; abs?: number }): boolean {
  return Math.abs(x - target) <= Math.max(tol.abs ?? 0, (tol.pct ?? 0) * Math.abs(target), 1e-6);
}

export interface ConfigureCheck {
  fact: string;
  label: string;
  pass: boolean;
  expected: number;
  got: number;
}

export interface ConfigureResult {
  score: number;
  checks: ConfigureCheck[];
}

/** The scenario with the correct inputs entered. */
export function configureKey(item: LeaseSimItem, start: LeaseScenario): LeaseScenario {
  if (item.task.kind !== 'configure') throw new Error(`${item.id} is not a configure task`);
  return applyPaths(start, item.task.target);
}

export function gradeLeaseConfigure(item: LeaseSimItem, start: LeaseScenario, student: LeaseScenario): ConfigureResult {
  if (item.task.kind !== 'configure') throw new Error(`${item.id} is not a configure task`);
  const task = item.task;
  const key = runScenario(configureKey(item, start)).facts;
  const got = runScenario(student).facts;
  const checks = task.checks.map((c) => ({ fact: c.fact, label: c.label, expected: key[c.fact], got: got[c.fact], pass: near(got[c.fact], key[c.fact], task.tolerance) }));
  return { score: checks.filter((c) => c.pass).length / checks.length, checks };
}

export type ShockDirection = 'up' | 'down' | 'none';

export interface ShockTruth {
  before: number;
  after: number;
  /** Fractional change in the output, e.g. -0.12. */
  change: number;
  direction: ShockDirection;
  shocked: LeaseScenario;
}

export function shockTruth(item: LeaseSimItem, start: LeaseScenario): ShockTruth {
  if (item.task.kind !== 'shock') throw new Error(`${item.id} is not a shock task`);
  const shocked = setPath(start, item.task.change.path, item.task.change.set);
  const before = runScenario(start).facts[item.task.output.fact];
  const after = runScenario(shocked).facts[item.task.output.fact];
  const change = before === 0 ? 0 : (after - before) / Math.abs(before);
  return { before, after, change, shocked, direction: Math.abs(change) < 1e-9 ? 'none' : change > 0 ? 'up' : 'down' };
}

/** Half credit for the right direction, full credit if the size is also within the band. `sizePct` is in percent, unsigned. */
export function gradeLeaseShock(item: LeaseSimItem, truth: ShockTruth, direction: ShockDirection, sizePct: number | null): { score: number; directionRight: boolean; sizeRight: boolean } {
  if (item.task.kind !== 'shock') throw new Error(`${item.id} is not a shock task`);
  const directionRight = direction === truth.direction;
  const actual = Math.abs(truth.change) * 100;
  const sizeRight = directionRight && sizePct !== null && Math.abs(Math.abs(sizePct) - actual) <= item.task.band * actual + 1e-9;
  return { score: !directionRight ? 0 : sizeRight || truth.direction === 'none' ? 1 : 0.5, directionRight, sizeRight };
}

/** Everything that can be wrong with a lease simulator question beyond the schema. Empty = fine. */
export function leaseItemProblems(item: LeaseSimItem): string[] {
  const problems: string[] = [];
  const s = item.scenario;
  const ids = s.tenants.map((t) => t.id);
  if (new Set(ids).size !== ids.length) problems.push('tenant ids must be unique');
  const leased = s.tenants.reduce((n, t) => n + t.sf, 0);
  if (leased > s.building.sf + 1e-6) problems.push(`tenants total ${leased} SF, more than the building's ${s.building.sf}`);
  for (const t of s.tenants) {
    if (t.recovery === 'base-year' && t.baseYearExpenses === undefined) problems.push(`${t.id}: a base-year lease needs baseYearExpenses`);
    if (t.recovery === 'stop' && t.stopPsf === undefined) problems.push(`${t.id}: an expense-stop lease needs stopPsf`);
  }
  const paths = [...item.editable, ...item.variants.flatMap((v) => Object.keys(v))];
  if (item.task.kind === 'configure') paths.push(...Object.keys(item.task.target));
  if (item.task.kind === 'shock') paths.push(item.task.change.path);
  for (const path of paths) if (getPath(s, path) === undefined) problems.push(`"${path}" is not a numeric input of the scenario`);
  if (problems.length) return problems;

  const known = runScenario(s).facts;
  if (item.task.kind === 'configure') {
    for (const path of Object.keys(item.task.target)) if (!item.editable.includes(path)) problems.push(`target "${path}" must be editable`);
    for (const c of item.task.checks) if (!(c.fact in known)) problems.push(`check "${c.fact}" is not a line of the report`);
  }
  if (item.task.kind === 'shock') {
    if (!(item.task.output.fact in known)) problems.push(`output "${item.task.output.fact}" is not a line of the report`);
    if (item.editable.length) problems.push('a shock question shows a locked simulator: leave editable empty');
  }
  return problems;
}
