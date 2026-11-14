/**
 * The Functions guide: what each important Excel function does, how its
 * arguments are laid out, a live example on a small sample sheet, and a
 * box to try your own version.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AssistPopup, useFormulaAssist } from '../components/FormulaAssist';
import { ALL_ITEMS } from '../content';
import { FN_CATEGORIES, FUNCTIONS, fnByName, syntaxOf, type FnDoc, type FnExample } from '../content/functions';
import { ITEM_TYPE_LABELS } from '../content/schema';
import { formatValue, isCellError, normalizeCellInput, type CellValue, type NumFormat } from '../engine/format';
import { colToLetter, parseA1, toA1 } from '../engine/refs';
import { unsupportedFunctionIn, Workbook } from '../engine/workbook';
import { ERROR_HELP } from '../grading/gridGrader';

const RESULT_CELL = 'Z50';

/** Evaluate a formula against an example's sample cells. */
export function evalExample(example: FnExample, formula: string): CellValue {
  const cells: Record<string, string | number> = {};
  for (const [addr, v] of Object.entries(example.cells)) {
    cells[addr] = typeof v === 'string' && !v.startsWith('=') ? `'${v}` : v;
  }
  cells[RESULT_CELL] = formula;
  const wb = new Workbook([{ name: 'S', cells }]);
  try {
    return wb.get('S', RESULT_CELL);
  } finally {
    wb.destroy();
  }
}

function formatFor(example: FnExample, addr: string, v: string | number): NumFormat {
  const col = addr.replace(/[0-9]/g, '');
  const f = example.formats?.[addr] ?? example.formats?.[col];
  if (f) return f;
  return typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 10000 ? 'int' : 'general';
}

function SampleSheet({ example }: { example: FnExample }) {
  const positions = Object.keys(example.cells).map(parseA1);
  const rows = Math.max(...positions.map((p) => p.row)) + 1;
  const cols = Math.max(...positions.map((p) => p.col)) + 1;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="sample-sheet">
        <thead>
          <tr>
            <th />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c}>{colToLetter(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <th>{r + 1}</th>
              {Array.from({ length: cols }, (_, c) => {
                const addr = toA1({ col: c, row: r });
                const v = example.cells[addr];
                if (v === undefined) return <td key={c} />;
                const isNumber = typeof v === 'number';
                return (
                  <td key={c} className={isNumber ? 'num' : ''}>
                    {isNumber ? formatValue(v, formatFor(example, addr, v)) : v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function describe(v: CellValue, fmt: NumFormat | undefined, formula: string): { text: string; ok: boolean } {
  if (isCellError(v)) {
    const fn = unsupportedFunctionIn(formula);
    if (fn) return { text: `This app cannot evaluate ${fn}(). It works in Excel.`, ok: false };
    return { text: `${v.error}  ${ERROR_HELP[v.type] ?? v.message}`, ok: false };
  }
  if (v === null || v === '') return { text: '(empty)', ok: true };
  return { text: formatValue(v, fmt ?? 'general'), ok: true };
}

/** A readable format for the result of an edited formula, which may no longer be the kind of number the example returned. */
function guessFormat(v: CellValue, exampleFormat: NumFormat | undefined): NumFormat {
  if (typeof v !== 'number') return 'general';
  const fmt = exampleFormat ?? 'general';
  if (fmt.startsWith('pct') && Math.abs(v) < 1) return 'pct2';
  if (fmt === 'date' && v > 20000 && Number.isInteger(v)) return 'date';
  if (Number.isInteger(v)) return 'int';
  return Math.abs(v) < 1 ? 'general' : 'num2';
}

function TryIt({ fn }: { fn: FnDoc }) {
  const example = fn.example!;
  const [text, setText] = useState(example.formula);
  const [caret, setCaret] = useState(example.formula.length);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const assistCtl = useFormulaAssist(text, caret, focused);

  useEffect(() => {
    setText(example.formula);
    setCaret(example.formula.length);
  }, [example.formula]);

  const result = useMemo(() => {
    const raw = normalizeCellInput(text);
    if (!raw.startsWith('=')) return { text: 'Start with an equals sign.', ok: false };
    const value = evalExample(example, raw);
    return describe(value, text.trim() === example.formula ? example.resultFormat : guessFormat(value, example.resultFormat), raw);
  }, [text, example]);

  const apply = (r: { text: string; caret: number }) => {
    setText(r.text);
    setCaret(r.caret);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(r.caret, r.caret));
  };

  return (
    <div className="tryit">
      <div className="num-row">
        <div className="num-box" style={{ flex: 1, minWidth: 220 }}>
          <input
            ref={inputRef}
            className="mono"
            style={{ width: '100%', fontSize: 15 }}
            value={text}
            spellCheck={false}
            autoComplete="off"
            aria-label={`Try a ${fn.name} formula`}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              const used = assistCtl.handleKey(e.key);
              if (used) {
                e.preventDefault();
                if (used !== 'handled') apply(used);
              }
            }}
          />
        </div>
        <button type="button" className="btn small" onClick={() => apply({ text: example.formula, caret: example.formula.length })} disabled={text === example.formula}>
          Reset
        </button>
      </div>
      <AssistPopup controller={assistCtl} getAnchor={() => inputRef.current} onPick={apply} />
      <div className={`tryit-result${result.ok ? '' : ' bad'}`} role="status">
        <span className="muted small">Result</span>
        <strong>{result.text}</strong>
      </div>
    </div>
  );
}

function Primer() {
  return (
    <details className="card primer">
      <summary>
        <strong>New to formulas? Start here: how a formula is put together</strong>
      </summary>
      <div className="primer-body">
        <div className="anatomy" aria-label="The parts of a formula">
          <span className="a-eq">=</span>
          <span className="a-fn">PMT</span>
          <span className="a-br">(</span>
          <span className="a-arg">B6/12</span>
          <span className="a-br">,</span>
          <span className="a-arg">B7*12</span>
          <span className="a-br">,</span>
          <span className="a-arg">B11</span>
          <span className="a-br">)</span>
        </div>
        <ul>
          <li>
            Every formula starts with <code>=</code>. Without it, Excel treats what you typed as plain text.
          </li>
          <li>
            A <strong>function</strong> is a named calculation: its name, then brackets, then its <strong>arguments</strong>{' '}
            separated by commas. Above, PMT has three: the rate, the number of payments, and the loan.
          </li>
          <li>
            An argument can be a number, a cell, a range, a calculation such as <code>B6/12</code>, or another function.
          </li>
          <li>
            In a template such as <code>PMT(rate, nper, pv, [fv], [type])</code>, square brackets mean the argument is{' '}
            <strong>optional</strong>, and <code>...</code> means you can keep adding more.
          </li>
          <li>
            <strong>References:</strong> <code>B4</code> is one cell, <code>B4:B9</code> is a range, <code>Model!B4</code> is a cell
            on another sheet. A <code>$</code> locks the letter or number after it when the formula is copied.
          </li>
          <li>
            <strong>Maths:</strong> <code>+</code> <code>-</code> <code>*</code> <code>/</code> and <code>^</code> for powers.
            Multiplying and dividing happen before adding and subtracting; use brackets to change the order.
          </li>
          <li>
            <strong>Text</strong> goes in double quotes: <code>"Occupied"</code>. <strong>Comparisons:</strong> <code>=</code>{' '}
            <code>&lt;&gt;</code> (not equal) <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code>.
          </li>
          <li>
            <strong>Percentages:</strong> type <code>5%</code> or <code>0.05</code>. They are the same number.
          </li>
        </ul>
        <h3>Help while you type</h3>
        <p>
          In any spreadsheet in this app, type <code>=</code> and the first letters of a function. A list of matches appears: use{' '}
          <kbd>↑</kbd> <kbd>↓</kbd> to choose and <kbd>Tab</kbd> to insert it. Once you are inside the brackets, the template
          appears with the argument you are on underlined, just as it does in Excel. Try it in any “Try it” box below.
        </p>
        <h3>What the error codes mean</h3>
        <table className="plain">
          <tbody>
            <tr>
              <td className="mono">#DIV/0!</td>
              <td>You divided by zero or by an empty cell.</td>
            </tr>
            <tr>
              <td className="mono">#NAME?</td>
              <td>Excel does not recognise a word: usually a misspelt function, or text without quotes.</td>
            </tr>
            <tr>
              <td className="mono">#VALUE!</td>
              <td>The wrong kind of input, such as text where a number is needed.</td>
            </tr>
            <tr>
              <td className="mono">#REF!</td>
              <td>The formula points at a cell that no longer exists, often after deleting a row or column.</td>
            </tr>
            <tr>
              <td className="mono">#N/A</td>
              <td>A lookup found no match.</td>
            </tr>
            <tr>
              <td className="mono">#NUM!</td>
              <td>The maths has no valid answer, such as an IRR with no sign change.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Detail({ fn }: { fn: FnDoc }) {
  const practice = useMemo(() => ALL_ITEMS.filter((i) => i.tags.some((t) => t.toUpperCase() === fn.name)).slice(0, 6), [fn.name]);
  const exampleResult = useMemo(
    () => (fn.example && fn.supported !== false ? describe(evalExample(fn.example, fn.example.formula), fn.example.resultFormat, fn.example.formula) : null),
    [fn],
  );

  return (
    <div className="card fn-detail">
      <div className="row">
        <h2 className="mono" style={{ fontSize: 22 }}>
          {fn.name}
        </h2>
        <span className="chip">{fn.category}</span>
        {fn.essential && <span className="chip accent">Essential</span>}
        {fn.availability && <span className="chip">{fn.availability}</span>}
        {fn.supported === false && <span className="chip">Not evaluated in this app</span>}
      </div>
      <p style={{ fontSize: 16, marginTop: 8 }}>{fn.summary}</p>
      <p className="muted">{fn.detail}</p>

      <h3>How to write it</h3>
      <div className="fn-syntax">={syntaxOf(fn)}</div>
      <table className="plain">
        <tbody>
          {fn.args.map((a) => (
            <tr key={a.name}>
              <td className="mono" style={{ whiteSpace: 'nowrap', width: 1 }}>
                {a.optional ? `[${a.name}]` : a.name}
              </td>
              <td>
                {a.optional && <span className="muted">Optional. </span>}
                {a.desc}
              </td>
            </tr>
          ))}
          {fn.repeat ? (
            <tr>
              <td className="mono">...</td>
              <td className="muted">
                The last {fn.repeat === 1 ? 'argument' : `${fn.repeat} arguments`} can be repeated as many times as you need.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {fn.example && (
        <>
          <h3>Example</h3>
          <SampleSheet example={fn.example} />
          <div className="fn-example">
            <code>{fn.example.formula}</code>
            {exampleResult && (
              <span>
                returns <strong>{exampleResult.text}</strong>
              </span>
            )}
          </div>
          <p className="muted small">{fn.example.note}</p>
          {fn.supported !== false && (
            <>
              <h3>Try it</h3>
              <p className="muted small" style={{ marginBottom: 6 }}>
                Edit the formula. It runs against the sample sheet above, so you can point it at other cells or break it on purpose.
              </p>
              <TryIt fn={fn} />
            </>
          )}
        </>
      )}

      <h3>In a real estate model</h3>
      <p>{fn.realEstate}</p>

      <h3>Watch out</h3>
      <ul>
        {fn.pitfalls.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      {fn.related && fn.related.length > 0 && (
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted small">Related:</span>
          {fn.related.map((r) => (
            <Link key={r} className="chip" to={`/functions/${r}`}>
              {r}
            </Link>
          ))}
        </div>
      )}

      {practice.length > 0 && (
        <>
          <h3>Practice it</h3>
          <div className="item-list">
            {practice.map((item) => (
              <Link key={item.id} className="item-row" to={`/item/${item.id}`}>
                <span className="chip">{ITEM_TYPE_LABELS[item.type]}</span>
                <span>{item.title}</span>
                <span className="state">Level {item.level}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Functions() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [onlyEssential, setOnlyEssential] = useState(false);
  const selected = fnByName(name ?? '') ?? FUNCTIONS.find((f) => f.name === 'IF') ?? FUNCTIONS[0];

  const q = query.trim().toLowerCase();
  const visible = FUNCTIONS.filter(
    (f) =>
      (!onlyEssential || f.essential) &&
      (q === '' || f.name.toLowerCase().includes(q) || f.summary.toLowerCase().includes(q) || f.realEstate.toLowerCase().includes(q)),
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Functions</h1>
          <p>
            The {FUNCTIONS.length} Excel functions that matter for real estate models: what each one does, how to write it, and a
            live example you can edit.
          </p>
        </div>
      </div>

      <div className="stack">
        <Primer />
        <div className="fn-layout">
          <div className="fn-list card">
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="Search: “lookup”, “loan”, “round”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search functions"
            />
            <label className="check small" style={{ margin: '8px 0 4px' }}>
              <input type="checkbox" checked={onlyEssential} onChange={(e) => setOnlyEssential(e.target.checked)} />
              <span>Essentials only ({FUNCTIONS.filter((f) => f.essential).length})</span>
            </label>
            {visible.length === 0 && <p className="muted small">No function matches that search.</p>}
            {FN_CATEGORIES.map((cat) => {
              const mine = visible.filter((f) => f.category === cat);
              if (mine.length === 0) return null;
              return (
                <div key={cat} className="fn-group">
                  <div className="fn-group-title">{cat}</div>
                  {mine.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      className={`fn-pick${f.name === selected.name ? ' on' : ''}`}
                      onClick={() => navigate(`/functions/${f.name}`)}
                    >
                      <span className="mono">{f.name}</span>
                      <small>{f.summary}</small>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <Detail key={selected.name} fn={selected} />
        </div>
      </div>
    </div>
  );
}
