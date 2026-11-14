/**
 * Works out what help to show while a formula is being typed, the way Excel does:
 *   - a list of matching function names while a name is being typed ("=PM" -> PMT, PPMT)
 *   - the argument template once inside a function's brackets, with the
 *     argument the cursor is on picked out ("=PMT(B4/12," -> nper)
 * Pure logic, no UI, so it can be tested.
 */
import { FUNCTIONS, fnByName, type FnDoc } from '../content/functions';

export type Assist =
  | { kind: 'suggest'; start: number; prefix: string; matches: FnDoc[] }
  | { kind: 'signature'; fn: FnDoc; argIndex: number; activeArg: number | null }
  | null;

const BEFORE_NAME = '=+-*/^(,<>& ';
const MAX_SUGGESTIONS = 8;

/** Which entry of fn.args the Nth typed argument corresponds to (handles repeating groups). */
export function activeArgFor(fn: FnDoc, argIndex: number): number | null {
  if (argIndex < fn.args.length) return argIndex;
  if (!fn.repeat) return null; // more arguments than the function takes
  const firstRepeating = fn.args.length - fn.repeat;
  return firstRepeating + ((argIndex - fn.args.length) % fn.repeat);
}

function insideString(text: string): boolean {
  let open = false;
  for (const ch of text) if (ch === '"') open = !open;
  return open;
}

function suggestionAt(text: string, caret: number): Assist {
  const before = text.slice(0, caret);
  const m = /([A-Za-z][A-Za-z0-9.]*)$/.exec(before);
  if (!m || m.index === 0) return null;
  const prev = before[m.index - 1];
  const next = text[caret] ?? '';
  if (!BEFORE_NAME.includes(prev)) return null;
  if (/[A-Za-z0-9.(]/.test(next)) return null; // in the middle of a name, or the bracket is already there
  const prefix = m[1].toUpperCase();
  const matches = FUNCTIONS.filter((f) => f.name.startsWith(prefix)).sort(
    (a, b) => Number(Boolean(b.essential)) - Number(Boolean(a.essential)) || a.name.localeCompare(b.name),
  );
  if (matches.length === 0) return null;
  return { kind: 'suggest', start: m.index, prefix, matches: matches.slice(0, MAX_SUGGESTIONS) };
}

function signatureAt(text: string, caret: number): Assist {
  const stack: { name: string; argIndex: number }[] = [];
  let inString = false;
  let braces = 0;
  for (let i = 0; i < caret; i++) {
    const ch = text[i];
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces = Math.max(0, braces - 1);
    else if (ch === '(') {
      let s = i;
      while (s > 0 && /[A-Za-z0-9.]/.test(text[s - 1])) s--;
      stack.push({ name: text.slice(s, i).toUpperCase(), argIndex: 0 });
    } else if (ch === ')') stack.pop();
    else if (ch === ',' && braces === 0 && stack.length) stack[stack.length - 1].argIndex++;
  }
  // The innermost enclosing function we know (skipping plain grouping brackets).
  for (let k = stack.length - 1; k >= 0; k--) {
    const fn = stack[k].name ? fnByName(stack[k].name) : undefined;
    if (fn) return { kind: 'signature', fn, argIndex: stack[k].argIndex, activeArg: activeArgFor(fn, stack[k].argIndex) };
    if (stack[k].name) return null; // inside a function we have no notes for
  }
  return null;
}

/**
 * @param skipSuggestions  set after the user dismisses the list with Esc, to fall back to the template
 */
export function analyzeFormula(text: string, caret: number, skipSuggestions = false): Assist {
  if (!/^[=+-]/.test(text)) return null;
  if (insideString(text.slice(0, caret))) return null;
  return (skipSuggestions ? null : suggestionAt(text, caret)) ?? signatureAt(text, caret);
}

/** Replace the partly typed name with the chosen function and an opening bracket. */
export function acceptSuggestion(text: string, caret: number, start: number, name: string): { text: string; caret: number } {
  const out = `${text.slice(0, start)}${name}(${text.slice(caret)}`;
  return { text: out, caret: start + name.length + 1 };
}
