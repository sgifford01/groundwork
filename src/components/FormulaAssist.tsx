/**
 * Excel-style help while typing a formula: a list of matching functions, then
 * the argument template with the current argument highlighted.
 * Used by the grid, the write-the-formula box and the Functions guide.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { acceptSuggestion, analyzeFormula, type Assist } from '../engine/formulaAssist';

export interface AssistController {
  assist: Assist;
  index: number;
  /** Give it each key press first. Returns null if it did not use the key. */
  handleKey: (key: string) => null | 'handled' | { text: string; caret: number };
  /** The text and cursor position after inserting suggestion `i`. */
  accept: (i: number) => { text: string; caret: number } | null;
}

export function useFormulaAssist(text: string, caret: number, enabled: boolean): AssistController {
  const [index, setIndex] = useState(0);
  const [dismissedText, setDismissedText] = useState<string | null>(null);
  const assist = useMemo(
    () => (enabled ? analyzeFormula(text, caret, dismissedText === text) : null),
    [text, caret, enabled, dismissedText],
  );
  const listKey = assist?.kind === 'suggest' ? assist.matches.map((m) => m.name).join(',') : '';
  useEffect(() => setIndex(0), [listKey]);

  const accept = (i: number) => {
    if (assist?.kind !== 'suggest') return null;
    const fn = assist.matches[Math.min(i, assist.matches.length - 1)];
    return acceptSuggestion(text, caret, assist.start, fn.name);
  };

  const handleKey: AssistController['handleKey'] = (key) => {
    if (assist?.kind !== 'suggest') return null;
    const n = assist.matches.length;
    if (key === 'ArrowDown') {
      setIndex((i) => (i + 1) % n);
      return 'handled';
    }
    if (key === 'ArrowUp') {
      setIndex((i) => (i - 1 + n) % n);
      return 'handled';
    }
    if (key === 'Tab') return accept(index) ?? 'handled';
    if (key === 'Escape') {
      setDismissedText(text);
      return 'handled';
    }
    return null;
  };

  return { assist, index, handleKey, accept };
}

export function AssistPopup({
  controller,
  getAnchor,
  onPick,
}: {
  controller: AssistController;
  /** The input being typed in. Read after render, so refs are ready. */
  getAnchor: () => HTMLElement | null;
  onPick: (result: { text: string; caret: number }) => void;
}) {
  const { assist, index } = controller;
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(getAnchor);
  anchorRef.current = getAnchor;

  useLayoutEffect(() => {
    if (!assist) {
      setPos(null);
      return;
    }
    const place = () => {
      const anchor = anchorRef.current();
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const boxH = boxRef.current?.offsetHeight ?? 120;
      const boxW = boxRef.current?.offsetWidth ?? 380;
      const below = r.bottom + 6;
      const top = below + boxH > window.innerHeight - 8 ? Math.max(8, r.top - boxH - 6) : below;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - boxW - 8));
      setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  });

  if (!assist) return null;
  const style = { left: pos?.left ?? -9999, top: pos?.top ?? -9999 };

  if (assist.kind === 'suggest') {
    return (
      <div ref={boxRef} className="fx-pop" style={style} role="listbox" aria-label="Matching functions">
        {assist.matches.map((fn, i) => (
          <div
            key={fn.name}
            role="option"
            aria-selected={i === index}
            className={`fx-option${i === index ? ' on' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault(); // keep the cursor in the formula
              const result = controller.accept(i);
              if (result) onPick(result);
            }}
          >
            <span className="fx-name">{fn.name}</span>
            <span className="fx-summary">{fn.summary}</span>
          </div>
        ))}
        <div className="fx-foot">
          <kbd>Tab</kbd> inserts the highlighted function · <kbd>↑</kbd> <kbd>↓</kbd> to choose · <kbd>Esc</kbd> to hide
        </div>
      </div>
    );
  }

  const { fn, activeArg } = assist;
  const arg = activeArg === null ? null : fn.args[activeArg];
  return (
    <div ref={boxRef} className="fx-pop" style={style} role="tooltip">
      <div className="fx-sig">
        {fn.name}(
        {fn.args.map((a, i) => (
          <span key={a.name}>
            {i > 0 && ', '}
            <span className={i === activeArg ? 'fx-arg on' : 'fx-arg'}>{a.optional ? `[${a.name}]` : a.name}</span>
          </span>
        ))}
        {fn.repeat ? ', ...' : ''})
      </div>
      {arg ? (
        <div className="fx-desc">
          <strong>{arg.name}</strong>
          {arg.optional ? ' (optional)' : ''}: {arg.desc}
        </div>
      ) : (
        <div className="fx-desc">That is more arguments than {fn.name} takes. Check your commas and brackets.</div>
      )}
      <div className="fx-foot">
        Square brackets mean optional.{' '}
        <a href={`#/functions/${fn.name}`} target="_blank" rel="noreferrer" onMouseDown={(e) => e.stopPropagation()}>
          Open {fn.name} in the Functions guide
        </a>
      </div>
    </div>
  );
}
