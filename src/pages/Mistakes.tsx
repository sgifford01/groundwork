/** Mistake journal: every answer that was not fully correct, with what went wrong. */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HBarList } from '../components/charts';
import { itemById } from '../content';
import { CATEGORIES, CORE_CATEGORY } from '../content/categories/registry';
import { ALL_TYPE_LABELS, MISTAKE_CATEGORIES, MISTAKE_LABELS, type MistakeCategory } from '../content/schema';
import { LEVELS } from '../content/topics';
import { startOfDay } from '../learn/sm2';
import { ALL_CATEGORIES, isNarrowScreen, startSession } from '../learn/start';
import { mistakeCounts, recentMisses } from '../learn/stats';
import { useProgress } from '../store/progress';

const DAY = 24 * 60 * 60 * 1000;

function when(ts: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Mistakes() {
  const attempts = useProgress((s) => s.attempts);
  const navigate = useNavigate();
  const [category, setCategory] = useState<MistakeCategory | 'all'>('all');
  const [level, setLevel] = useState<number | 'all'>('all');
  const [area, setArea] = useState('all'); // a category slug, or 'all'
  const areaOf = (itemId: string) => itemById(itemId)?.category ?? CORE_CATEGORY;
  const [openOnly, setOpenOnly] = useState(false);
  const now = Date.now();

  const wrong = useMemo(() => attempts.filter((a) => !a.correct).reverse(), [attempts]);
  const stillOpen = useMemo(() => new Set(recentMisses(attempts)), [attempts]);
  const counts = useMemo(() => mistakeCounts(attempts), [attempts]);
  const rows = wrong.filter(
    (a) =>
      (category === 'all' || a.category === category) &&
      (area === 'all' || areaOf(a.itemId) === area) &&
      (level === 'all' || (a.level === level && areaOf(a.itemId) === CORE_CATEGORY)) &&
      (!openOnly || stillOpen.has(a.itemId)),
  );
  const levelsSeen = [...new Set(wrong.filter((a) => areaOf(a.itemId) === CORE_CATEGORY).map((a) => a.level))].sort((a, b) => a - b);
  const areasSeen = CATEGORIES.filter((c) => wrong.some((a) => areaOf(a.itemId) === c.slug));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mistake journal</h1>
          <p>
            {wrong.length === 0
              ? 'Every answer that is not fully correct is logged here automatically.'
              : `${wrong.length} logged. ${stillOpen.size} question${stillOpen.size === 1 ? '' : 's'} still unresolved (the latest attempt was a miss).`}
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={stillOpen.size === 0}
          onClick={() => {
            if (startSession({ minutes: 20, mode: 'mistakes', noGrids: isNarrowScreen(), category: ALL_CATEGORIES }) > 0) navigate('/session');
          }}
        >
          Drill my mistakes
        </button>
      </div>

      {wrong.length === 0 ? (
        <div className="empty">Nothing here yet. Mistakes are useful: each one tells the app what to bring back sooner.</div>
      ) : (
        <div className="stack">
          <div className="card">
            <h2>By type of mistake</h2>
            <HBarList rows={counts.map((c) => ({ label: MISTAKE_LABELS[c.category], value: c.count }))} unit="times" />
          </div>

          <div className="card">
            <div className="filters" style={{ marginBottom: 12 }}>
              <label className="field">
                Mistake type
                <select value={category} onChange={(e) => setCategory(e.target.value as MistakeCategory | 'all')}>
                  <option value="all">All types</option>
                  {MISTAKE_CATEGORIES.filter((c) => counts.some((x) => x.category === c)).map((c) => (
                    <option key={c} value={c}>
                      {MISTAKE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              {areasSeen.length > 1 && (
                <label className="field">
                  Category
                  <select value={area} onChange={(e) => setArea(e.target.value)}>
                    <option value="all">All categories</option>
                    {areasSeen.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                Level (core course)
                <select value={level} onChange={(e) => setLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value="all">All levels</option>
                  {levelsSeen.map((l) => (
                    <option key={l} value={l}>
                      L{l} {LEVELS.find((x) => x.level === l)?.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
                <span>Only unresolved</span>
              </label>
              <span className="muted small" style={{ marginLeft: 'auto' }}>
                Showing {rows.length} of {wrong.length}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="plain">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Question</th>
                    <th>Your answer</th>
                    <th>Correct answer</th>
                    <th>What went wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((a) => {
                    const item = itemById(a.itemId);
                    return (
                      <tr key={`${a.itemId}-${a.ts}`}>
                        <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                          {when(a.ts, now)}
                        </td>
                        <td>
                          <Link to={`/item/${a.itemId}`}>{item?.title ?? a.itemId}</Link>
                          <div className="muted small">
                            {item ? ALL_TYPE_LABELS[item.type] : ''}
                            {stillOpen.has(a.itemId) ? ' · unresolved' : ' · since answered correctly'}
                          </div>
                        </td>
                        <td>{a.given ?? <span className="muted">(none)</span>}</td>
                        <td>{a.expected ?? ''}</td>
                        <td>
                          {a.category && <strong>{MISTAKE_LABELS[a.category]}. </strong>}
                          {a.detail ?? ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > 200 && <p className="muted small">Showing the latest 200.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
