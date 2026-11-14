/**
 * Cell-reference helpers: A1 <-> row/col conversion, finding references inside
 * a formula, shifting them (what Excel does on copy/fill), and F4 anchoring.
 */

export interface CellPos {
  col: number; // 0-based
  row: number; // 0-based
}

export function colToLetter(col: number): string {
  let s = '';
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToCol(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function toA1(pos: CellPos): string {
  return `${colToLetter(pos.col)}${pos.row + 1}`;
}

const A1_RE = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})$/;

export function isA1(s: string): boolean {
  return A1_RE.test(s);
}

export function parseA1(a1: string): CellPos {
  const m = A1_RE.exec(a1);
  if (!m) throw new Error(`Not a cell address: "${a1}"`);
  return { col: letterToCol(m[1]), row: parseInt(m[2], 10) - 1 };
}

/** A reference found inside a formula string. */
export interface RefToken {
  start: number; // index of first char (may be a $)
  end: number; // index after last char
  text: string;
  colAbs: boolean;
  rowAbs: boolean;
  col: number;
  row: number;
  /** Sheet prefix including the "!" (e.g. "Inputs!" or "'Rent Roll'!"), or "". */
  sheetPrefix: string;
}

const REF_STICKY = /(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})/y;
const BEFORE_BLOCK = /[A-Za-z0-9_.$]/;
const AFTER_BLOCK = /[A-Za-z0-9_(!.]/;

/**
 * Find every cell reference in a formula. Skips text in "double quotes" and
 * sheet names in 'single quotes', and ignores look-alikes such as LOG10( or
 * a named value like rate2.
 */
export function findRefs(formula: string): RefToken[] {
  const out: RefToken[] = [];
  let i = 0;
  let lastQuotedSheet = '';
  let lastQuotedEnd = -1;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      i++;
      while (i < formula.length) {
        if (formula[i] === '"') {
          if (formula[i + 1] === '"') i += 2;
          else break;
        } else i++;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      const start = i;
      i++;
      while (i < formula.length && formula[i] !== "'") i++;
      i++;
      if (formula[i] === '!') {
        lastQuotedSheet = formula.slice(start, i + 1);
        lastQuotedEnd = i + 1;
        i++;
      }
      continue;
    }
    const prev = i > 0 ? formula[i - 1] : '';
    if (!(prev && BEFORE_BLOCK.test(prev))) {
      REF_STICKY.lastIndex = i;
      const m = REF_STICKY.exec(formula);
      if (m) {
        const end = i + m[0].length;
        const next = formula[end] ?? '';
        if (!(next && AFTER_BLOCK.test(next))) {
          let sheetPrefix = '';
          if (lastQuotedEnd === i) sheetPrefix = lastQuotedSheet;
          else if (prev === '!') {
            // unquoted sheet name directly before the "!"
            let s = i - 2;
            while (s >= 0 && /[A-Za-z0-9_.]/.test(formula[s])) s--;
            sheetPrefix = formula.slice(s + 1, i);
          }
          out.push({
            start: i,
            end,
            text: m[0],
            colAbs: m[1] === '$',
            rowAbs: m[3] === '$',
            col: letterToCol(m[2]),
            row: parseInt(m[4], 10) - 1,
            sheetPrefix,
          });
          i = end;
          continue;
        }
        // Not a reference: skip the whole identifier so we don't re-match inside it.
        while (i < formula.length && /[A-Za-z0-9_.$]/.test(formula[i])) i++;
        continue;
      }
      // Skip any identifier (function name, named value) as one unit.
      if (/[A-Za-z_]/.test(ch)) {
        while (i < formula.length && /[A-Za-z0-9_.]/.test(formula[i])) i++;
        // unquoted sheet prefix like Inputs!B2 -> let the ref after "!" be matched next
        if (formula[i] === '!') i++;
        continue;
      }
    }
    i++;
  }
  return out;
}

export function refText(col: number, row: number, colAbs: boolean, rowAbs: boolean): string {
  return `${colAbs ? '$' : ''}${colToLetter(col)}${rowAbs ? '$' : ''}${row + 1}`;
}

function rebuild(formula: string, refs: RefToken[], replace: (r: RefToken, i: number) => string): string {
  let out = '';
  let last = 0;
  refs.forEach((r, i) => {
    out += formula.slice(last, r.start) + replace(r, i);
    last = r.end;
  });
  return out + formula.slice(last);
}

/**
 * Shift the relative parts of every reference, exactly as Excel does when a
 * formula is copied `dCol` columns right and `dRow` rows down.
 */
export function shiftFormula(formula: string, dCol: number, dRow: number): string {
  if (!formula.startsWith('=') || (dCol === 0 && dRow === 0)) return formula;
  const refs = findRefs(formula);
  return rebuild(formula, refs, (r) => {
    const col = r.colAbs ? r.col : r.col + dCol;
    const row = r.rowAbs ? r.row : r.row + dRow;
    if (col < 0 || row < 0) return '#REF!';
    return refText(col, row, r.colAbs, r.rowAbs);
  });
}

/** Return the formula with chosen references re-anchored. */
export function withAnchors(
  formula: string,
  changes: Map<number, { colAbs: boolean; rowAbs: boolean }>,
): string {
  const refs = findRefs(formula);
  return rebuild(formula, refs, (r, i) => {
    const c = changes.get(i);
    return c ? refText(r.col, r.row, c.colAbs, c.rowAbs) : r.text;
  });
}

/** Excel's F4 order: A1 -> $A$1 -> A$1 -> $A1 -> A1 */
export function cycleAnchor(colAbs: boolean, rowAbs: boolean): { colAbs: boolean; rowAbs: boolean } {
  if (!colAbs && !rowAbs) return { colAbs: true, rowAbs: true };
  if (colAbs && rowAbs) return { colAbs: false, rowAbs: true };
  if (!colAbs && rowAbs) return { colAbs: true, rowAbs: false };
  return { colAbs: false, rowAbs: false };
}

/**
 * Apply F4 to the reference touching the caret. Returns the new text and the
 * caret position (end of the changed reference), or null if no reference is there.
 */
export function cycleRefAt(
  formula: string,
  caret: number,
): { text: string; caret: number; start: number } | null {
  if (!formula.startsWith('=')) return null;
  const refs = findRefs(formula);
  // Prefer a reference the caret is inside or directly after.
  let idx = refs.findIndex((r) => caret > r.start && caret <= r.end);
  if (idx < 0) idx = refs.findIndex((r) => caret === r.start);
  if (idx < 0) return null;
  const r = refs[idx];
  const next = cycleAnchor(r.colAbs, r.rowAbs);
  const replacement = refText(r.col, r.row, next.colAbs, next.rowAbs);
  const text = formula.slice(0, r.start) + replacement + formula.slice(r.end);
  return { text, caret: r.start + replacement.length, start: r.start };
}

/** Normalise a formula for "is this the same formula" checks (not grading). */
export function normalizeFormula(f: string): string {
  let out = '';
  let inStr = false;
  for (const ch of f) {
    if (ch === '"') inStr = !inStr;
    if (inStr) out += ch;
    else if (ch !== ' ') out += ch.toUpperCase();
  }
  return out;
}

export function rangeAddresses(a: CellPos, b: CellPos): CellPos[] {
  const out: CellPos[] = [];
  const r0 = Math.min(a.row, b.row);
  const r1 = Math.max(a.row, b.row);
  const c0 = Math.min(a.col, b.col);
  const c1 = Math.max(a.col, b.col);
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) out.push({ col, row });
  return out;
}
