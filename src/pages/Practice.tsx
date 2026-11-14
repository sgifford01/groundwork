/** Session builder: pick a length and a focus, then start. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsOfCategory } from '../content';
import { CATEGORIES, CORE_CATEGORY } from '../content/categories/registry';
import { ALL_TYPE_LABELS } from '../content/schema';
import { SESSION_MODES, type SessionMode } from '../learn/session';
import { ALL_CATEGORIES, isNarrowScreen, previewSession, startSession } from '../learn/start';
import { useProgress } from '../store/progress';

export function Practice() {
  const navigate = useNavigate();
  const cards = useProgress((s) => s.cards);
  const [category, setCategory] = useState(CORE_CATEGORY);
  const [minutes, setMinutes] = useState(20);
  const [mode, setMode] = useState<SessionMode>('mixed');
  const [noGrids, setNoGrids] = useState(isNarrowScreen());

  const preview = useMemo(
    () => previewSession({ minutes, mode, noGrids, category }),
    // cards is listed so the preview refreshes after practice
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minutes, mode, noGrids, category, cards],
  );
  const estMinutes = Math.round(preview.reduce((s, i) => s + i.estMinutes, 0));
  const byType = new Map<string, number>();
  for (const i of preview) byType.set(i.type, (byType.get(i.type) ?? 0) + 1);

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Practice</h1>
          <p>Sessions mix topics and question types on purpose. Mixing feels harder and sticks better.</p>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>Which category?</h2>
          <label className="field">
            <span className="sr-only">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => itemsOfCategory(c.slug).length > 0).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title} ({itemsOfCategory(c.slug).length} questions)
                </option>
              ))}
              <option value={ALL_CATEGORIES}>All categories together</option>
            </select>
          </label>
        </div>

        <div className="card">
          <h2>How long?</h2>
          <div className="seg" role="group" aria-label="Session length">
            {[10, 20, 45].map((m) => (
              <button key={m} type="button" className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>
                {m} minutes
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>What to practice?</h2>
          <div className="options" role="radiogroup" aria-label="Session focus">
            {SESSION_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                className={`option${mode === m.value ? ' picked' : ''}`}
                onClick={() => setMode(m.value)}
              >
                <span>
                  <strong>{m.label}</strong>
                  <div className="option-why">{m.blurb}</div>
                </span>
              </button>
            ))}
          </div>
          <label className="check" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={noGrids} onChange={(e) => setNoGrids(e.target.checked)} />
            <span>
              Cards and quick questions only <span className="muted">(leaves out spreadsheet tasks and shortcut drills; best on a phone)</span>
            </span>
          </label>
        </div>

        <div className="card">
          <div className="spread">
            <div>
              <h2 style={{ marginBottom: 4 }}>
                {preview.length === 0
                  ? 'Nothing to practice in this mode right now'
                  : `${preview.length} question${preview.length === 1 ? '' : 's'}, about ${estMinutes} minutes`}
              </h2>
              <div className="row">
                {[...byType.entries()].map(([type, n]) => (
                  <span className="chip" key={type}>
                    {n} × {ALL_TYPE_LABELS[type as keyof typeof ALL_TYPE_LABELS]}
                  </span>
                ))}
                {preview.length === 0 && <span className="muted small">Try “Smart mix” or “New material”, or pick a question in the Library.</span>}
              </div>
            </div>
            <button
              type="button"
              className="btn primary big"
              disabled={preview.length === 0}
              onClick={() => {
                if (startSession({ minutes, mode, noGrids, category }) > 0) navigate('/session');
              }}
            >
              Start session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
