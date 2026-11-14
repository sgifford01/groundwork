/**
 * The Excel-style grid.
 *
 * Keyboard (not editing):  arrows move · Shift+arrows select · Enter down · Tab right
 *                          F2 (or Ctrl+U) edit · typing replaces · Delete clears
 *                          Ctrl/Cmd+C/X/V copy, cut, paste (references shift like Excel)
 *                          Ctrl/Cmd+D fill down · Ctrl/Cmd+R fill right · Ctrl/Cmd+Z undo
 * Keyboard (editing):      Enter/Tab commit · Esc cancel · F4 cycles $ anchors
 *                          arrows or a click after "=", "+", "(" ... point at a cell
 *
 * Colours: blue = hardcoded input, black = formula, green = link to another sheet,
 *          grey = locked, yellow = cells to fill in.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SheetSpec } from '../../content/schema';
import { formatValue, isCellError, normalizeCellInput, type CellValue, type NumFormat } from '../../engine/format';
import { colToLetter, cycleRefAt, findRefs, isA1, parseA1, shiftFormula, toA1, type CellPos } from '../../engine/refs';
import { Workbook } from '../../engine/workbook';
import { buildSheetData, isLocked, type GridAttempt, type TargetStatus } from '../../grading/gridGrader';
import { AssistPopup, useFormulaAssist } from '../FormulaAssist';
import './grid.css';

export interface GridProps {
  sheets: SheetSpec[];
  /** What the student has typed: sheet -> cell -> raw text. */
  value: GridAttempt;
  onChange: (next: GridAttempt) => void;
  /** Grading marks, keyed "Sheet!A1". */
  feedback?: Record<string, TargetStatus>;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Draw answer cells like ordinary cells (error hunts: the student must find them). */
  plainTargets?: boolean;
  /** Cells to outline, keyed "Sheet!A1" (the current step of a guided case). */
  highlight?: Set<string>;
}

interface Sel {
  anchor: CellPos; // the active cell
  focus: CellPos; // the far corner of the selected range
}

interface Rect {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

interface EditState {
  text: string;
  /** enter: arrows commit or point · edit: arrows move the text cursor */
  mode: 'enter' | 'edit';
  where: 'cell' | 'bar';
  origin: CellPos;
  /** The reference currently being pointed at with arrows/mouse (a span of `text`). */
  point: null | { start: number; end: number; anchor: CellPos; focus: CellPos };
}

interface Clip {
  sheet: number;
  rect: Rect;
  rows: string[][];
  tsv: string;
  cut: boolean;
}

type Move = 'down' | 'up' | 'left' | 'right' | 'none';

const DEFAULT_COL_WIDTH = 96;
const REF_COLORS = 6;

function rectOf(sel: Sel): Rect {
  return {
    r0: Math.min(sel.anchor.row, sel.focus.row),
    r1: Math.max(sel.anchor.row, sel.focus.row),
    c0: Math.min(sel.anchor.col, sel.focus.col),
    c1: Math.max(sel.anchor.col, sel.focus.col),
  };
}

function inRect(r: Rect, p: CellPos): boolean {
  return p.row >= r.r0 && p.row <= r.r1 && p.col >= r.c0 && p.col <= r.c1;
}

function sheetSize(sheet: SheetSpec, typed: Record<string, string> = {}) {
  let maxRow = 0;
  let maxCol = 0;
  for (const addr of [...Object.keys(sheet.cells), ...Object.keys(typed)]) {
    const p = parseA1(addr);
    maxRow = Math.max(maxRow, p.row);
    maxCol = Math.max(maxCol, p.col);
  }
  return { rows: Math.max(maxRow + 4, 10), cols: Math.max(maxCol + 3, 6) };
}

function firstTarget(sheet: SheetSpec): CellPos {
  const targets = Object.entries(sheet.cells)
    .filter(([, c]) => c.kind === 'target')
    .map(([a]) => parseA1(a))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  return targets[0] ?? { col: 0, row: 0 };
}

/** After one of these characters, Excel expects a cell reference next. */
function expectingRef(text: string, caret: number): boolean {
  if (!/^[=+-]/.test(text)) return false;
  let i = caret - 1;
  while (i >= 0 && text[i] === ' ') i--;
  if (i < 0) return false;
  return '=+-*/^(,:<>&'.includes(text[i]);
}

function refString(a: CellPos, b: CellPos): string {
  if (a.col === b.col && a.row === b.row) return toA1(a);
  const tl = { col: Math.min(a.col, b.col), row: Math.min(a.row, b.row) };
  const br = { col: Math.max(a.col, b.col), row: Math.max(a.row, b.row) };
  return `${toA1(tl)}:${toA1(br)}`;
}

function inferFormat(detailed: string): NumFormat {
  if (detailed === 'NUMBER_PERCENT') return 'pct2';
  if (detailed === 'NUMBER_CURRENCY') return 'usd';
  if (detailed === 'NUMBER_DATE') return 'date';
  return 'general';
}

export function Grid({
  sheets,
  value,
  onChange,
  feedback,
  readOnly = false,
  autoFocus = false,
  plainTargets = false,
  highlight,
}: GridProps) {
  const [sheetIdx, setSheetIdx] = useState(0);
  const sheet = sheets[Math.min(sheetIdx, sheets.length - 1)];
  const typed = value[sheet.name] ?? {};
  const { rows, cols } = sheetSize(sheet, typed);

  const [sel, setSel] = useState<Sel>(() => {
    const p = firstTarget(sheets[0]);
    return { anchor: p, focus: p };
  });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);
  const [notice, setNotice] = useState('');
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  /** Where the text cursor is in the formula being typed (drives the function help). */
  const [caret, setCaret] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const dragRef = useRef<null | 'select' | 'point'>(null);
  const history = useRef<{ past: GridAttempt[]; future: GridAttempt[] }>({ past: [], future: [] });

  // ---- the formula engine, kept in step with `value` ------------------------
  const engine = useRef<{ wb: Workbook | null; sheets: SheetSpec[] | null; synced: GridAttempt | null }>({
    wb: null,
    sheets: null,
    synced: null,
  });

  function getWb(): Workbook {
    const e = engine.current;
    if (!e.wb || e.sheets !== sheets) {
      e.wb?.destroy();
      e.wb = new Workbook(buildSheetData(sheets, 'student', value));
      e.sheets = sheets;
      e.synced = value;
    } else if (e.synced !== value) {
      const prev = e.synced ?? {};
      const wb = e.wb;
      wb.batch(() => {
        for (const s of sheets) {
          const a = prev[s.name] ?? {};
          const b = value[s.name] ?? {};
          for (const addr of new Set([...Object.keys(a), ...Object.keys(b)])) {
            if (isLocked(s, addr)) continue;
            if ((a[addr] ?? '') !== (b[addr] ?? '')) wb.set(s.name, addr, b[addr] ? b[addr] : null);
          }
        }
      });
      e.synced = value;
    }
    return e.wb;
  }

  useEffect(
    () => () => {
      engine.current.wb?.destroy();
      engine.current.wb = null;
    },
    [],
  );

  const wb = getWb();

  // ---- reading cells --------------------------------------------------------
  const active = sel.anchor;
  const activeAddr = toA1(active);
  const range = rectOf(sel);

  function rawAt(addr: string): string {
    const c = sheet.cells[addr];
    if (!c) return typed[addr] ?? '';
    if (c.kind === 'label') return c.text;
    if (c.kind === 'input') return String(c.value);
    if (c.kind === 'given') return c.formula;
    return typed[addr] ?? '';
  }

  function valueAt(addr: string): CellValue {
    return wb.get(sheet.name, addr);
  }

  function canEdit(pos: CellPos): boolean {
    return !readOnly && !isLocked(sheet, toA1(pos));
  }

  function clamp(p: CellPos): CellPos {
    return { col: Math.max(0, Math.min(cols - 1, p.col)), row: Math.max(0, Math.min(rows - 1, p.row)) };
  }

  function select(pos: CellPos, extend = false) {
    const p = clamp(pos);
    setSel((s) => (extend ? { anchor: s.anchor, focus: p } : { anchor: p, focus: p }));
  }

  // ---- writing cells --------------------------------------------------------
  function writeCells(changes: Record<string, string>) {
    const next = { ...typed };
    let changed = false;
    for (const [addr, raw] of Object.entries(changes)) {
      if (isLocked(sheet, addr)) continue;
      if ((typed[addr] ?? '') === raw) continue;
      if (raw === '') delete next[addr];
      else next[addr] = raw;
      changed = true;
    }
    if (!changed) return;
    history.current.past.push(value);
    if (history.current.past.length > 200) history.current.past.shift();
    history.current.future = [];
    onChange({ ...value, [sheet.name]: next });
  }

  function undo() {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push(value);
    onChange(prev);
  }

  function redo() {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(value);
    onChange(next);
  }

  // ---- editing --------------------------------------------------------------
  function activeInput(): HTMLInputElement | null {
    if (!edit) return null;
    return edit.where === 'cell' ? cellInputRef.current : barInputRef.current;
  }

  function caretNow(): { start: number; end: number } {
    const el = activeInput();
    const len = edit?.text.length ?? 0;
    return { start: el?.selectionStart ?? len, end: el?.selectionEnd ?? len };
  }

  function lockedNotice() {
    setNotice('That cell is locked. Type in a yellow cell, or use any empty cell for scratch work.');
  }

  function startEdit(text: string, mode: 'enter' | 'edit', where: 'cell' | 'bar', pos: CellPos = active) {
    if (!canEdit(pos)) {
      lockedNotice();
      return;
    }
    setNotice('');
    pendingCaret.current = text.length;
    setCaret(text.length);
    setEdit({ text, mode, where, origin: pos, point: null });
  }

  function moveBy(pos: CellPos, move: Move): CellPos {
    if (move === 'down') return { col: pos.col, row: pos.row + 1 };
    if (move === 'up') return { col: pos.col, row: pos.row - 1 };
    if (move === 'left') return { col: pos.col - 1, row: pos.row };
    if (move === 'right') return { col: pos.col + 1, row: pos.row };
    return pos;
  }

  function commit(move: Move, thenSelect?: CellPos) {
    if (!edit) return;
    writeCells({ [toA1(edit.origin)]: normalizeCellInput(edit.text) });
    const origin = edit.origin;
    setEdit(null);
    select(thenSelect ?? moveBy(origin, move));
    containerRef.current?.focus();
  }

  function cancelEdit() {
    setEdit(null);
    containerRef.current?.focus();
  }

  /** Insert or replace the pointed-at reference inside the formula being typed. */
  function setPoint(anchor: CellPos, focus: CellPos) {
    if (!edit) return;
    const caret = caretNow();
    const start = edit.point ? edit.point.start : caret.start;
    const end = edit.point ? edit.point.end : caret.end;
    const a = clamp(anchor);
    const f = clamp(focus);
    const ref = refString(a, f);
    const text = edit.text.slice(0, start) + ref + edit.text.slice(end);
    pendingCaret.current = start + ref.length;
    setCaret(start + ref.length);
    setEdit({ ...edit, text, point: { start, end: start + ref.length, anchor: a, focus: f } });
  }

  function pressF4() {
    if (!edit) return;
    const caret = caretNow().start;
    const r = cycleRefAt(edit.text, caret);
    if (!r) return;
    const grew = r.text.length - edit.text.length;
    pendingCaret.current = r.caret;
    setCaret(r.caret);
    setEdit({ ...edit, text: r.text, point: edit.point ? { ...edit.point, end: edit.point.end + grew } : null });
  }

  // Function help: a list of matching names, then the argument template. Hidden while pointing at cells.
  const assistCtl = useFormulaAssist(edit?.text ?? '', caret, edit !== null && edit.point === null);

  function applyAssist(result: { text: string; caret: number }) {
    if (!edit) return;
    pendingCaret.current = result.caret;
    setCaret(result.caret);
    setEdit({ ...edit, text: result.text, point: null });
  }

  function onEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!edit) return;
    // The suggestion list gets first call on Tab, the up/down arrows and Esc.
    const used = assistCtl.handleKey(e.key);
    if (used) {
      e.preventDefault();
      if (used !== 'handled') applyAssist(used);
      return;
    }
    const k = e.key;
    if (k === 'Enter') {
      e.preventDefault();
      commit(e.shiftKey ? 'up' : 'down');
    } else if (k === 'Tab') {
      e.preventDefault();
      commit(e.shiftKey ? 'left' : 'right');
    } else if (k === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (k === 'F4') {
      e.preventDefault();
      pressF4();
    } else if (k === 'F2') {
      e.preventDefault();
      setEdit({ ...edit, mode: edit.mode === 'enter' ? 'edit' : 'enter', point: null });
    } else if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowRight') {
      const move: Move = k === 'ArrowDown' ? 'down' : k === 'ArrowUp' ? 'up' : k === 'ArrowLeft' ? 'left' : 'right';
      if (edit.point) {
        e.preventDefault();
        const f = moveBy(edit.point.focus, move);
        setPoint(e.shiftKey ? edit.point.anchor : f, f);
      } else if (edit.mode === 'enter') {
        e.preventDefault();
        const caret = caretNow();
        if (expectingRef(edit.text, caret.start)) {
          const p = moveBy(edit.origin, move);
          setPoint(p, p);
        } else commit(move);
      }
      // in "edit" mode the arrows move the text cursor, as in Excel
    }
  }

  function onEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!edit) return;
    setCaret(e.target.selectionStart ?? e.target.value.length);
    setEdit({ ...edit, text: e.target.value, point: null });
  }

  // Put focus and the text cursor where they belong after each edit-state change.
  useLayoutEffect(() => {
    if (!edit) return;
    const el = activeInput();
    if (!el) return;
    if (document.activeElement !== el) el.focus();
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  useEffect(() => {
    if (autoFocus) containerRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Keep the active cell in view by scrolling the sheet only (never the whole page).
  useEffect(() => {
    const box = containerRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-addr="${toA1(sel.focus)}"]`);
    if (!box || !el) return;
    const b = box.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    const top = b.top + 24; // below the sticky column letters
    const left = b.left + 40; // right of the sticky row numbers
    const bottom = b.top + box.clientHeight;
    const right = b.left + box.clientWidth;
    if (c.top < top) box.scrollTop -= top - c.top;
    else if (c.bottom > bottom) box.scrollTop += c.bottom - bottom;
    if (c.left < left) box.scrollLeft -= left - c.left;
    else if (c.right > right) box.scrollLeft += c.right - right;
  }, [sel.focus.col, sel.focus.row, sheetIdx]);

  // ---- clipboard, fill, clear -----------------------------------------------
  function copySelection(cut: boolean): string {
    const rowsOut: string[][] = [];
    for (let r = range.r0; r <= range.r1; r++) {
      const row: string[] = [];
      for (let c = range.c0; c <= range.c1; c++) row.push(rawAt(toA1({ col: c, row: r })));
      rowsOut.push(row);
    }
    const tsv = rowsOut.map((r) => r.join('\t')).join('\n');
    setClip({ sheet: sheetIdx, rect: range, rows: rowsOut, tsv, cut });
    return tsv;
  }

  function pasteBlock(block: string[][], src: Rect | null, cut: boolean) {
    const h = block.length;
    const w = Math.max(...block.map((r) => r.length));
    const selH = range.r1 - range.r0 + 1;
    const selW = range.c1 - range.c0 + 1;
    // Paste once, or tile across the selection when it is a whole multiple of the block.
    const outH = selH % h === 0 && selW % w === 0 ? selH : h;
    const outW = selH % h === 0 && selW % w === 0 ? selW : w;
    const changes: Record<string, string> = {};
    for (let i = 0; i < outH; i++) {
      for (let j = 0; j < outW; j++) {
        const dest = { col: range.c0 + j, row: range.r0 + i };
        if (dest.col >= cols + 20 || dest.row >= rows + 200) continue;
        const raw = block[i % h][j % w] ?? '';
        if (src && !cut) {
          const from = { col: src.c0 + (j % w), row: src.r0 + (i % h) };
          changes[toA1(dest)] = shiftFormula(raw, dest.col - from.col, dest.row - from.row);
        } else {
          changes[toA1(dest)] = src ? raw : normalizeCellInput(raw);
        }
      }
    }
    if (src && cut) {
      for (let r = src.r0; r <= src.r1; r++)
        for (let c = src.c0; c <= src.c1; c++) {
          const a = toA1({ col: c, row: r });
          if (!(a in changes)) changes[a] = '';
        }
      setClip(null);
    }
    writeCells(changes);
    setSel({
      anchor: { col: range.c0, row: range.r0 },
      focus: clamp({ col: range.c0 + outW - 1, row: range.r0 + outH - 1 }),
    });
  }

  function fill(dir: 'right' | 'down') {
    const changes: Record<string, string> = {};
    if (dir === 'right') {
      const c0 = range.c0 === range.c1 ? range.c0 - 1 : range.c0;
      if (c0 < 0) return;
      for (let r = range.r0; r <= range.r1; r++) {
        const src = rawAt(toA1({ col: c0, row: r }));
        for (let c = c0 + 1; c <= range.c1; c++) changes[toA1({ col: c, row: r })] = shiftFormula(src, c - c0, 0);
      }
    } else {
      const r0 = range.r0 === range.r1 ? range.r0 - 1 : range.r0;
      if (r0 < 0) return;
      for (let c = range.c0; c <= range.c1; c++) {
        const src = rawAt(toA1({ col: c, row: r0 }));
        for (let r = r0 + 1; r <= range.r1; r++) changes[toA1({ col: c, row: r })] = shiftFormula(src, 0, r - r0);
      }
    }
    writeCells(changes);
  }

  function clearSelection() {
    const changes: Record<string, string> = {};
    let locked = 0;
    for (let r = range.r0; r <= range.r1; r++)
      for (let c = range.c0; c <= range.c1; c++) {
        const a = toA1({ col: c, row: r });
        if (isLocked(sheet, a)) locked++;
        else changes[a] = '';
      }
    if (locked && Object.keys(changes).length === 0) lockedNotice();
    writeCells(changes);
  }

  // Native copy / cut / paste events, so no clipboard permission prompt is needed.
  const clipboardHandlers = useRef({ copySelection, pasteBlock, clip, editing: false, readOnly });
  clipboardHandlers.current = { copySelection, pasteBlock, clip, editing: edit !== null, readOnly };
  useEffect(() => {
    const mine = () => document.activeElement === containerRef.current && !clipboardHandlers.current.editing;
    const onCopy = (e: ClipboardEvent) => {
      if (!mine()) return;
      e.clipboardData?.setData('text/plain', clipboardHandlers.current.copySelection(false));
      e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      if (!mine() || clipboardHandlers.current.readOnly) return;
      e.clipboardData?.setData('text/plain', clipboardHandlers.current.copySelection(true));
      e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!mine() || clipboardHandlers.current.readOnly) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      e.preventDefault();
      const c = clipboardHandlers.current.clip;
      if (c && c.tsv === text) clipboardHandlers.current.pasteBlock(c.rows, c.rect, c.cut);
      else if (text) {
        const block = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
        clipboardHandlers.current.pasteBlock(block, null, false);
      }
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ---- keyboard (not editing) -----------------------------------------------
  function isBlank(p: CellPos): boolean {
    const a = toA1(p);
    const c = sheet.cells[a];
    if (c?.kind === 'label') return c.text === '';
    const v = valueAt(a);
    return v === null || v === '';
  }

  /** Ctrl+Arrow: jump to the edge of the current block of data, like Excel. */
  function jump(from: CellPos, move: Move): CellPos {
    let p = from;
    const inside = (q: CellPos) => q.col >= 0 && q.col < cols && q.row >= 0 && q.row < rows;
    const next = moveBy(p, move);
    if (!inside(next)) return p;
    if (!isBlank(p) && !isBlank(next)) {
      while (inside(moveBy(p, move)) && !isBlank(moveBy(p, move))) p = moveBy(p, move);
      return p;
    }
    p = next;
    while (inside(moveBy(p, move)) && isBlank(p)) p = moveBy(p, move);
    return p;
  }

  function onGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (edit || e.target !== containerRef.current) return;
    const k = e.key;
    const mod = e.metaKey || e.ctrlKey;
    const arrow: Move | null =
      k === 'ArrowDown' ? 'down' : k === 'ArrowUp' ? 'up' : k === 'ArrowLeft' ? 'left' : k === 'ArrowRight' ? 'right' : null;

    // Selection moves are computed from the latest state, so fast key repeats never skip a step.
    const step = (move: Move, extend: boolean, toEdge: boolean) =>
      setSel((s) => {
        const from = extend ? s.focus : s.anchor;
        const p = clamp(toEdge ? jump(from, move) : moveBy(from, move));
        return extend ? { anchor: s.anchor, focus: p } : { anchor: p, focus: p };
      });

    if (arrow) {
      e.preventDefault();
      step(arrow, e.shiftKey, mod);
      setNotice('');
    } else if (k === 'Enter') {
      e.preventDefault();
      step(e.shiftKey ? 'up' : 'down', false, false);
    } else if (k === 'Tab') {
      e.preventDefault();
      step(e.shiftKey ? 'left' : 'right', false, false);
    } else if (k === 'F2' || (e.ctrlKey && k.toLowerCase() === 'u')) {
      e.preventDefault();
      startEdit(rawAt(activeAddr), 'edit', 'cell');
    } else if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      if (!readOnly) clearSelection();
    } else if (k === 'Home') {
      e.preventDefault();
      select(mod ? { col: 0, row: 0 } : { col: 0, row: active.row }, e.shiftKey);
    } else if (k === 'Escape') {
      setClip(null);
      setNotice('');
    } else if (mod && k.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && k.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if (mod && k.toLowerCase() === 'd') {
      e.preventDefault();
      if (!readOnly) fill('down');
    } else if (mod && k.toLowerCase() === 'r') {
      e.preventDefault();
      if (!readOnly) fill('right');
    } else if (mod && k.toLowerCase() === 'a') {
      e.preventDefault();
      setSel({ anchor: { col: 0, row: 0 }, focus: { col: cols - 1, row: rows - 1 } });
    } else if (e.ctrlKey && k === '`') {
      e.preventDefault();
      setShowFormulas((s) => !s);
    } else if (k.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      if (!readOnly) startEdit(k, 'enter', 'cell');
    }
  }

  // ---- mouse ----------------------------------------------------------------
  function onCellMouseDown(pos: CellPos, e: React.MouseEvent) {
    if (e.button !== 0) return;
    if (edit) {
      const caret = caretNow();
      const sameCell = pos.col === edit.origin.col && pos.row === edit.origin.row;
      if (!sameCell && (edit.point || expectingRef(edit.text, caret.start))) {
        e.preventDefault(); // keep typing focus in the formula
        setPoint(pos, pos);
        dragRef.current = 'point';
        return;
      }
      if (sameCell) return;
      e.preventDefault();
      commit('none', pos);
      return;
    }
    e.preventDefault();
    containerRef.current?.focus({ preventScroll: true });
    select(pos, e.shiftKey);
    setNotice('');
    dragRef.current = 'select';
  }

  function onCellMouseEnter(pos: CellPos) {
    if (dragRef.current === 'select') select(pos, true);
    else if (dragRef.current === 'point' && edit?.point) setPoint(edit.point.anchor, pos);
  }

  function onCellDoubleClick(pos: CellPos) {
    if (edit) return;
    startEdit(rawAt(toA1(pos)), 'edit', 'cell', pos);
  }

  // ---- things to draw -------------------------------------------------------
  // Cells referenced by the formula being edited get a coloured outline.
  const refTint = new Map<string, number>();
  if (edit && /^[=+-]/.test(edit.text)) {
    const refs = findRefs(edit.text).filter((r) => r.sheetPrefix === '');
    let color = 0;
    for (let i = 0; i < refs.length; i++) {
      const a = refs[i];
      const b = refs[i + 1] && edit.text.slice(a.end, refs[i + 1].start) === ':' ? refs[i + 1] : a;
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
          const key = toA1({ col: c, row: r });
          if (!refTint.has(key)) refTint.set(key, color % REF_COLORS);
        }
      if (b !== a) i++;
      color++;
    }
  }

  // Sum / average / count of the selection, as in Excel's status bar.
  let stats = '';
  if (!edit && (range.r0 !== range.r1 || range.c0 !== range.c1)) {
    let sum = 0;
    let n = 0;
    for (let r = range.r0; r <= range.r1; r++)
      for (let c = range.c0; c <= range.c1; c++) {
        const a = toA1({ col: c, row: r });
        if (sheet.cells[a]?.kind === 'label') continue;
        const v = valueAt(a);
        if (typeof v === 'number') {
          sum += v;
          n++;
        }
      }
    if (n > 0) {
      const f = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 2 });
      stats = `Average: ${f(sum / n)}   Count: ${n}   Sum: ${f(sum)}`;
    }
  }

  const modeLabel = edit ? (edit.point ? 'Point' : edit.mode === 'enter' ? 'Enter' : 'Edit') : 'Ready';
  const barText = edit ? edit.text : rawAt(activeAddr);
  const activeEditable = canEdit(active);

  function renderCell(row: number, col: number) {
    const pos = { col, row };
    const addr = toA1(pos);
    const spec = sheet.cells[addr];
    const raw = rawAt(addr);
    const isActive = active.col === col && active.row === row;
    const editingHere = edit !== null && edit.origin.col === col && edit.origin.row === row;

    const classes = ['xl-cell'];
    let text = '';
    let align: 'left' | 'right' | 'center' = 'left';

    if (spec?.kind === 'label') {
      classes.push('k-label', `s-${spec.style ?? 'normal'}`);
      text = spec.text;
      align = spec.align ?? 'left';
      if (spec.indent) classes.push(`indent-${spec.indent}`);
    } else {
      const v = valueAt(addr);
      const isFormula = raw.startsWith('=');
      const fmt: NumFormat = spec?.format ?? inferFormat(v === null ? '' : wb.detailedType(sheet.name, addr));
      text = showFormulas && isFormula ? raw : formatValue(v, fmt);
      if (isCellError(v)) {
        classes.push('is-error');
        align = 'center';
      } else if (typeof v === 'number' && !(showFormulas && isFormula)) align = 'right';
      else if (typeof v === 'boolean') align = 'center';

      if (spec?.kind === 'input') classes.push('k-input', 'c-input');
      else if (spec?.kind === 'given') classes.push('k-given', raw.includes('!') ? 'c-link' : 'c-formula');
      else {
        classes.push(spec?.kind === 'target' ? (plainTargets ? 'k-plain' : 'k-target') : 'k-scratch');
        if (isFormula) classes.push(raw.includes('!') ? 'c-link' : 'c-formula');
        else if (typeof v === 'number') classes.push('c-input'); // a typed number is a hardcode: blue
        else classes.push('c-formula');
      }
    }
    if (spec && 'bold' in spec && spec.bold) classes.push('bold');
    if (spec && 'border' in spec && spec.border) classes.push(`b-${spec.border}`);
    if (spec && spec.kind !== 'target') classes.push('locked');

    if (inRect(range, pos) && !(range.r0 === range.r1 && range.c0 === range.c1)) classes.push('in-range');
    if (isActive) classes.push('active');
    if (clip && clip.sheet === sheetIdx && inRect(clip.rect, pos)) {
      classes.push('clip');
      if (row === clip.rect.r0) classes.push('clip-t');
      if (row === clip.rect.r1) classes.push('clip-b');
      if (col === clip.rect.c0) classes.push('clip-l');
      if (col === clip.rect.c1) classes.push('clip-r');
    }
    const tint = refTint.get(addr);
    if (tint !== undefined) classes.push('ref', `ref-${tint}`);
    const mark = feedback?.[`${sheet.name}!${addr}`];
    if (mark) classes.push(`fb-${mark}`);
    if (highlight?.has(`${sheet.name}!${addr}`)) classes.push('hl');

    return (
      <td
        key={addr}
        data-addr={addr}
        className={classes.join(' ')}
        style={{ textAlign: align }}
        onMouseDown={(e) => onCellMouseDown(pos, e)}
        onMouseEnter={() => onCellMouseEnter(pos)}
        onDoubleClick={() => onCellDoubleClick(pos)}
        role="gridcell"
        aria-selected={isActive}
      >
        {editingHere && edit.where === 'cell' ? (
          <input
            ref={cellInputRef}
            className="xl-cell-input"
            value={edit.text}
            onChange={onEditChange}
            onKeyDown={onEditKeyDown}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            style={{ width: `max(100%, ${edit.text.length + 2}ch)` }}
            spellCheck={false}
            autoComplete="off"
            aria-label={`Editing ${addr}`}
          />
        ) : (
          <span className="xl-cell-text">{editingHere ? edit.text : text}</span>
        )}
      </td>
    );
  }

  const colIndexes = Array.from({ length: cols }, (_, i) => i);
  const rowIndexes = Array.from({ length: rows }, (_, i) => i);

  return (
    <div className={`xl${readOnly ? ' is-readonly' : ''}`}>
      <div className="xl-bar">
        <input
          className="xl-namebox"
          aria-label="Name box"
          value={nameDraft ?? activeAddr}
          onChange={(e) => setNameDraft(e.target.value.toUpperCase())}
          onFocus={(e) => e.target.select()}
          onBlur={() => setNameDraft(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const t = (nameDraft ?? '').trim();
              if (isA1(t)) select(parseA1(t));
              setNameDraft(null);
              containerRef.current?.focus();
            } else if (e.key === 'Escape') {
              setNameDraft(null);
              containerRef.current?.focus();
            }
          }}
          spellCheck={false}
        />
        <button
          type="button"
          className="xl-tool"
          title="Cycle $ anchors on the reference at the cursor (F4)"
          onMouseDown={(e) => {
            e.preventDefault();
            pressF4();
          }}
          disabled={!edit}
        >
          $
        </button>
        <span className="xl-fx" aria-hidden="true">
          fx
        </span>
        <input
          ref={barInputRef}
          className="xl-formula"
          aria-label="Formula bar"
          value={barText}
          readOnly={!edit || edit.where !== 'bar'}
          onMouseDown={() => {
            if (!edit && activeEditable) startEdit(rawAt(activeAddr), 'edit', 'bar');
            else if (edit && edit.where === 'cell') setEdit({ ...edit, where: 'bar', mode: 'edit', point: null });
            else if (!edit) lockedNotice();
          }}
          onChange={onEditChange}
          onKeyDown={onEditKeyDown}
          onSelect={(e) => {
            if (edit?.where === 'bar') setCaret(e.currentTarget.selectionStart ?? 0);
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className={`xl-tool wide${showFormulas ? ' on' : ''}`}
          title="Show formulas instead of values (Ctrl+`)"
          onClick={() => setShowFormulas((s) => !s)}
        >
          {showFormulas ? 'Values' : 'Formulas'}
        </button>
      </div>

      <div
        className="xl-scroll"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        role="grid"
        aria-label={`Spreadsheet ${sheet.name}`}
      >
        <table className="xl-table">
          <colgroup>
            <col style={{ width: 40 }} />
            {colIndexes.map((c) => (
              <col key={c} style={{ width: sheet.widths?.[colToLetter(c)] ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="xl-corner" />
              {colIndexes.map((c) => (
                <th key={c} className={c >= range.c0 && c <= range.c1 ? 'on' : ''}>
                  {colToLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowIndexes.map((r) => (
              <tr key={r}>
                <th className={r >= range.r0 && r <= range.r1 ? 'on' : ''}>{r + 1}</th>
                {colIndexes.map((c) => renderCell(r, c))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sheets.length > 1 && (
        <div className="xl-tabs" role="tablist">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={i === sheetIdx}
              className={i === sheetIdx ? 'on' : ''}
              onClick={() => {
                if (edit) commit('none');
                setSheetIdx(i);
                const p = firstTarget(s);
                setSel({ anchor: p, focus: p });
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="xl-status">
        <span className="xl-mode">{modeLabel}</span>
        <span className="xl-notice">{notice}</span>
        <span className="xl-stats">{stats}</span>
      </div>
      {edit && <AssistPopup controller={assistCtl} getAnchor={activeInput} onPick={applyAssist} />}
    </div>
  );
}
