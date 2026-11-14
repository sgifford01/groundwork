/**
 * Randomised inputs for questions, and the small template language used in
 * prompts and explanations:
 *
 *   {noi}            -> the value of variable "noi", shown in its own format
 *   {noi|usd}        -> same, with a format override
 *   {=noi/cap|usd}   -> a formula evaluated on the fly, then formatted
 */
import { formatValue, type NumFormat, type Scalar } from './format';
import { evalFormula } from './workbook';
import { pick, randInt, type Rng } from './rng';

export type VarSpec =
  | { name: string; min: number; max: number; step: number; format?: NumFormat }
  | { name: string; choices: (number | string)[]; format?: NumFormat }
  | { name: string; formula: string; format?: NumFormat };

export type VarValues = Record<string, Scalar>;

function decimals(n: number): number {
  const s = String(n);
  if (s.includes('e-')) return parseInt(s.split('e-')[1], 10);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function roundTo(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Pick a value on the min..max grid defined by step. */
export function sampleRange(rng: Rng, min: number, max: number, step: number): number {
  const n = Math.max(0, Math.round((max - min) / step));
  const k = randInt(rng, 0, n);
  return roundTo(min + k * step, Math.max(decimals(step), decimals(min)));
}

/** Sample every variable in order. Formula variables can use earlier ones. */
export function sampleVars(specs: readonly VarSpec[], rng: Rng): VarValues {
  const out: VarValues = {};
  for (const spec of specs) {
    if ('formula' in spec) {
      const v = evalFormula(spec.formula, out);
      if (typeof v === 'object' && v !== null) {
        throw new Error(`Variable "${spec.name}" formula ${spec.formula} failed: ${v.error} ${v.message}`);
      }
      out[spec.name] = v;
    } else if ('choices' in spec) {
      out[spec.name] = pick(rng, spec.choices);
    } else {
      out[spec.name] = sampleRange(rng, spec.min, spec.max, spec.step);
    }
  }
  return out;
}

const TEMPLATE_RE = /\{(=[^}|]+|[A-Za-z_][A-Za-z0-9_]*)(?:\|([a-z0-9]+))?\}/g;

export function renderTemplate(
  template: string,
  values: VarValues = {},
  specs: readonly VarSpec[] = [],
): string {
  return template.replace(TEMPLATE_RE, (whole, expr: string, fmt?: string) => {
    if (expr.startsWith('=')) {
      const v = evalFormula(expr, values);
      return formatValue(v, (fmt as NumFormat) ?? 'general');
    }
    if (!(expr in values)) return whole;
    const spec = specs.find((s) => s.name === expr);
    return formatValue(values[expr], (fmt as NumFormat) ?? spec?.format ?? 'general');
  });
}

/** Names a variable may not use because the engine would read them as cells. */
export function isValidVarName(name: string): boolean {
  if (!/^[a-z][a-z_]*[a-z]$/.test(name)) return false;
  return !['true', 'false'].includes(name);
}
