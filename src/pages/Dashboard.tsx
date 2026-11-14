import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalibrationChart, HBarList, MeterRow, TrendChart } from '../components/charts';
import { ALL_ITEMS, itemById } from '../content';
import { MISTAKE_LABELS } from '../content/schema';
import { LEVELS, TOPICS } from '../content/topics';
import { isLevelUnlocked, levelHasContent, levelMastery, topicMastery, UNLOCK_AT } from '../learn/mastery';
import { dueItems, newItems } from '../learn/session';
import { isNarrowScreen, startSession } from '../learn/start';
import { startOfDay } from '../learn/sm2';
import { accuracyByDay, calibration, mistakeCounts, overallAccuracy, recentMisses, streak } from '../learn/stats';
import { useProgress } from '../store/progress';

const DAY = 24 * 60 * 60 * 1000;

function when(ts: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const CORE_TOPICS = new Set<string>(TOPICS.map((t) => t.id));

/** The core course's dashboard. `embedded` drops the page frame so it can sit inside the category page. */
export function Dashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const cards = useProgress((s) => s.cards);
  const allAttempts = useProgress((s) => s.attempts);
  // this dashboard is about the core course, so attempts from other categories are left out
  const attempts = useMemo(() => allAttempts.filter((a) => CORE_TOPICS.has(a.topic)), [allAttempts]);
  const settings = useProgress((s) => s.settings);
  const updateSettings = useProgress((s) => s.updateSettings);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const now = Date.now();

  const due = dueItems(ALL_ITEMS, cards, now).length;
  const fresh = newItems(ALL_ITEMS, cards, settings.manualLevel).length;
  const streakDays = streak(attempts, now);
  const practicedToday = attempts.some((a) => a.ts >= startOfDay(now));
  const trend = accuracyByDay(attempts, now, 14);
  const recentAccuracy = overallAccuracy(attempts.filter((a) => a.ts > now - 14 * DAY));
  const seen = ALL_ITEMS.filter((i) => (cards[i.id]?.seen ?? 0) > 0).length;
  const mistakes = mistakeCounts(attempts).slice(0, 6);
  const misses = recentMisses(attempts);
  const lastMisses = attempts.filter((a) => !a.correct && a.detail).slice(-5).reverse();
  const calib = calibration(attempts);
  const rated = calib.reduce((n, c) => n + c.count, 0);
  const levels = LEVELS.filter((l) => levelHasContent(l.level, ALL_ITEMS));
  const comingLater = LEVELS.filter((l) => !levelHasContent(l.level, ALL_ITEMS));

  function go(minutes: number, mode: 'mixed' | 'mistakes' = 'mixed') {
    const n = startSession({ minutes, mode, noGrids: isNarrowScreen() });
    if (n === 0) setMessage('Nothing to practice in that mode right now. Open the Library to pick any question.');
    else navigate('/session');
  }

  return (
    <div className={embedded ? '' : 'page'}>
      <div className="page-head">
        <div>
          {embedded ? <h2>Your progress</h2> : <h1>Dashboard</h1>}
          <p>
            {due > 0
              ? `${due} review${due === 1 ? '' : 's'} due and ${fresh} new question${fresh === 1 ? '' : 's'} waiting.`
              : fresh > 0
                ? `No reviews due. ${fresh} new question${fresh === 1 ? '' : 's'} waiting.`
                : 'You are caught up. Come back when reviews fall due.'}
          </p>
        </div>
        <div className="row">
          <span className="muted small">Start a session:</span>
          {[10, 20, 45].map((mins) => (
            <button key={mins} type="button" className={`btn${mins === 20 ? ' primary' : ''}`} onClick={() => go(mins)}>
              {mins} min
            </button>
          ))}
        </div>
      </div>

      {message && <div className="toast" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="stack">
        <div className="tiles">
          <div className="tile">
            <div className="tile-label">Day streak</div>
            <div className="tile-value">{streakDays}</div>
            <div className="tile-sub">{practicedToday ? 'Practiced today' : 'Practice today to extend it'}</div>
          </div>
          <div className="tile">
            <div className="tile-label">Due today</div>
            <div className="tile-value">{due}</div>
            <div className="tile-sub">{fresh} new available</div>
          </div>
          <div className="tile">
            <div className="tile-label">Questions answered</div>
            <div className="tile-value">{attempts.length.toLocaleString('en-US')}</div>
            <div className="tile-sub">
              {seen} of {ALL_ITEMS.length} seen at least once
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Accuracy, last 14 days</div>
            <div className="tile-value">{recentAccuracy === null ? '–' : `${Math.round(recentAccuracy * 100)}%`}</div>
            <div className="tile-sub">Average score per question</div>
          </div>
        </div>

        <div className="cols-2">
          <div className="card">
            <h2>Mastery by topic</h2>
            {levels.map((l) => {
              const unlocked = isLevelUnlocked(l.level, settings.manualLevel, ALL_ITEMS, cards);
              const lm = levelMastery(l.level, ALL_ITEMS, cards);
              return (
                <div className="meter-group" key={l.level}>
                  <div className="meter-group-head">
                    <span className="chip accent">L{l.level}</span>
                    <span>{l.name}</span>
                    <span className="muted small" style={{ marginLeft: 'auto' }}>
                      {unlocked ? `${Math.round(lm * 100)}%` : 'Locked'}
                    </span>
                  </div>
                  {!unlocked && (
                    <div className="row small muted" style={{ marginBottom: 6 }}>
                      Opens when earlier levels reach {Math.round(UNLOCK_AT * 100)}%.
                      <button type="button" className="btn small" onClick={() => updateSettings({ manualLevel: l.level })}>
                        Jump ahead
                      </button>
                    </div>
                  )}
                  {TOPICS.filter((t) => t.level === l.level && ALL_ITEMS.some((i) => i.topic === t.id)).map((t) => (
                    <MeterRow key={t.id} name={t.name} value={topicMastery(t.id, ALL_ITEMS, cards)} locked={!unlocked} />
                  ))}
                </div>
              );
            })}
            {comingLater.length > 0 && (
              <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
                Still to be added: {comingLater.map((l) => `L${l.level} ${l.name}`).join(', ')}.
              </p>
            )}
          </div>

          <div className="stack">
            <div className="card">
              <h2>Accuracy trend</h2>
              {attempts.length === 0 ? (
                <div className="empty">Answer a few questions and your daily accuracy will appear here.</div>
              ) : (
                <TrendChart data={trend} />
              )}
            </div>

            <div className="card">
              <div className="spread" style={{ marginBottom: 12 }}>
                <h2>Most common mistake types</h2>
                {misses.length > 0 && (
                  <button type="button" className="btn small" onClick={() => go(20, 'mistakes')}>
                    Drill my mistakes
                  </button>
                )}
              </div>
              {mistakes.length === 0 ? (
                <div className="empty">No mistakes logged yet.</div>
              ) : (
                <HBarList rows={mistakes.map((m) => ({ label: MISTAKE_LABELS[m.category], value: m.count }))} unit="times" />
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Confidence vs. accuracy</h2>
          {rated < 5 ? (
            <div className="empty">
              After a few more answers this shows whether you are as right as you feel. You choose a confidence level
              every time you lock in an answer.
            </div>
          ) : (
            <CalibrationChart data={calib} />
          )}
        </div>

        {lastMisses.length > 0 && (
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <h2>Recent mistakes</h2>
              <Link className="btn small" to="/mistakes">
                Open the mistake journal
              </Link>
            </div>
            <table className="plain">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>What went wrong</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {lastMisses.map((a) => (
                  <tr key={`${a.itemId}-${a.ts}`}>
                    <td>
                      <Link to={`/item/${a.itemId}`}>{itemById(a.itemId)?.title ?? a.itemId}</Link>
                    </td>
                    <td>
                      {a.category && <strong>{MISTAKE_LABELS[a.category]}. </strong>}
                      {a.detail}
                    </td>
                    <td className="muted">{when(a.ts, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
