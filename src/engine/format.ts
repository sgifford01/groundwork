/**
 * Number formats used across the app. Negatives are shown in parentheses,
 * the way real estate models show them.
 */

export const NUM_FORMATS = [
  'general',
  'int',
  'num1',
  'num2',
  'usd',
  'usd2',
  'pct',
  'pct1',
  'pct2',
  'mult',
  'date',
  'text',
] as const;

export type NumFormat = (typeof NUM_FORMATS)[number];

export interface CellError {
  error: string; // e.g. "#DIV/0!"
  type: string; // e.g. "DIV_BY_ZERO"
  message: string;
}

export type Scalar = number | string | boolean | null;
export type CellValue = Scalar | CellError;

export function isCellError(v: unknown): v is CellError {
  return typeof v === 'object' && v !== null && 'error' in v;
}

/** The equivalent Excel number-format codes (used for .xlsx export). */
export const EXCEL_NUMFMT: Record<NumFormat, string> = {
  general: 'General',
  int: '#,##0_);(#,##0)',
  num1: '#,##0.0_);(#,##0.0)',
  num2: '#,##0.00_);(#,##0.00)',
  usd: '"$"#,##0_);("$"#,##0)',
  usd2: '"$"#,##0.00_);("$"#,##0.00)',
  pct: '0%_);(0%)',
  pct1: '0.0%_);(0.0%)',
  pct2: '0.00%_);(0.00%)',
  mult: '0.00"x"_);(0.00"x")',
  date: 'm/d/yyyy',
  text: '@',
};

function group(n: number, decimals: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function paren(neg: boolean, body: string): string {
  return neg ? `(${body})` : body;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH + Math.round(serial) * 86400000);
}

export function dateToSerial(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / 86400000);
}

export function formatDate(serial: number): string {
  const d = serialToDate(serial);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

function general(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e10 || abs < 1e-6) return n.toExponential(4);
  return String(Number(n.toPrecision(10)));
}

export function formatNumber(n: number, fmt: NumFormat): string {
  if (!Number.isFinite(n)) return '#NUM!';
  const neg = n < 0;
  const a = Math.abs(n);
  switch (fmt) {
    case 'int':
      return paren(neg && Math.round(a) !== 0, group(a, 0));
    case 'num1':
      return paren(neg, group(a, 1));
    case 'num2':
      return paren(neg, group(a, 2));
    case 'usd':
      return paren(neg && Math.round(a) !== 0, `$${group(a, 0)}`);
    case 'usd2':
      return paren(neg, `$${group(a, 2)}`);
    case 'pct':
      return paren(neg, `${group(a * 100, 0)}%`);
    case 'pct1':
      return paren(neg, `${group(a * 100, 1)}%`);
    case 'pct2':
      return paren(neg, `${group(a * 100, 2)}%`);
    case 'mult':
      return paren(neg, `${group(a, 2)}x`);
    case 'date':
      return formatDate(n);
    case 'text':
    case 'general':
    default:
      return general(n);
  }
}

export function formatValue(v: CellValue | undefined, fmt: NumFormat = 'general'): string {
  if (v === null || v === undefined) return '';
  if (isCellError(v)) return v.error;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  return formatNumber(v, fmt);
}

/**
 * Parse what a person types into a number box: "$1,250,000", "5.5%",
 * "1.45x", "(250)", "1.2m", "850k".
 * Returns { value, hadPercent } or null if it isn't a number.
 */
export function parseTypedNumber(input: string): { value: number; hadPercent: boolean } | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (s.startsWith('-')) {
    neg = !neg;
    s = s.slice(1);
  } else if (s.startsWith('+')) s = s.slice(1);
  let mult = 1;
  let hadPercent = false;
  if (s.endsWith('%')) {
    hadPercent = true;
    mult = 0.01;
    s = s.slice(0, -1);
  } else if (s.endsWith('bps')) {
    mult = 0.0001;
    s = s.slice(0, -3);
  } else if (s.endsWith('x')) {
    s = s.slice(0, -1);
  } else if (s.endsWith('mm')) {
    mult = 1e6;
    s = s.slice(0, -2);
  } else if (s.endsWith('m')) {
    mult = 1e6;
    s = s.slice(0, -1);
  } else if (s.endsWith('k')) {
    mult = 1e3;
    s = s.slice(0, -1);
  } else if (s.endsWith('b')) {
    mult = 1e9;
    s = s.slice(0, -1);
  }
  if (!/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return null;
  const n = parseFloat(s) * mult;
  if (!Number.isFinite(n)) return null;
  return { value: neg ? -n : n, hadPercent };
}

/**
 * Tidy what a person types into a grid cell before the engine sees it:
 * "1,250,000" -> "1250000", "(500)" -> "-500", "+B2*3" -> "=+B2*3".
 * Formulas and ordinary text pass through untouched.
 */
export function normalizeCellInput(raw: string): string {
  const s = raw.trim();
  if (s === '') return '';
  if (s.startsWith('=')) return s;
  if (/^\(?[-+]?\$?\d[\d,]*(\.\d+)?%?\)?$/.test(s) || /^\(?[-+]?\$?\.\d+%?\)?$/.test(s)) {
    let t = s.replace(/,/g, '');
    if (t.startsWith('(') && t.endsWith(')')) t = `-${t.slice(1, -1)}`;
    return t.replace(/^\+/, '');
  }
  // Excel treats +A1 or -A1*2 as a formula.
  if (/^[+-]/.test(s) && /[A-Za-z(]/.test(s)) return `=${s}`;
  return s;
}
