/** Runs the queued session one question at a time, then shows a summary. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ItemRunner } from '../components/ItemRunner';
import { itemById } from '../content';
import { ALL_TYPE_LABELS } from '../content/schema';
import { LEVELS } from '../content/topics';
import { newSeed } from '../engine/rng';
import { PASS_SHARE, placementOutcome } from '../learn/placement';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

function minutes(ms: number): string {
  const m = Math.round(ms / 60000);
  return m < 1 ? 'under a minute' : `${m} minute${m === 1 ? '' : 's'}`;
}

export function SessionPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [seed, setSeed] = useState(() => newSeed());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const total = session.queue.length;
  const item = useMemo(() => itemById(session.queue[session.index] ?? ''), [session.queue, session.index]);
  const updateSettings = useProgress((s) => s.updateSettings);
  const finished = session.active && session.index >= total;

  // Placement: a skipped question counts as a miss.
  const placement = useMemo(() => {
    if (session.kind !== 'placement' || !finished) return null;
    return placementOutcome(
      session.queue.map((id) => ({
        level: itemById(id)?.level ?? 0,
        score: session.results.find((r) => r.itemId === id)?.score ?? 0,
      })),
    );
  }, [session.kind, session.queue, session.results, finished]);

  useEffect(() => {
    if (placement) updateSettings({ manualLevel: placement.level });
  }, [placement, updateSettings]);

  if (!session.active) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>No session in progress</h2>
          <p className="muted">Start one from the Practice page.</p>
          <Link className="btn primary" to="/practice">
            Build a session
          </Link>
        </div>
      </div>
    );
  }

  const advance = () => {
    if (session.index + 1 >= total) setFinishedAt(Date.now());
    session.next();
    setSeed(newSeed());
    window.scrollTo({ top: 0 });
  };

  // ---- summary ----
  if (session.index >= total || !item) {
    const results = session.results;
    const avg = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
    const perfect = results.filter((r) => r.score >= 0.999).length;
    const elapsed = (finishedAt ?? Date.now()) - session.startedAt;
    return (
      <div className="page narrow">
        <div className="page-head">
          <div>
            <h1>Session complete</h1>
            <p>{session.title}</p>
          </div>
        </div>
        <div className="stack">
          {placement && (
            <div className="card">
              <h2>
                You start at Level {placement.level}: {LEVELS.find((l) => l.level === placement.level)?.name}
              </h2>
              <p className="muted small">
                Every level up to that one is now open. A level counts as passed at {Math.round(PASS_SHARE * 100)}% or
                better. You can change this any time in Settings.
              </p>
              <table className="plain">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th className="num">Questions</th>
                    <th className="num">Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {placement.byLevel.map((row) => (
                    <tr key={row.level}>
                      <td>
                        L{row.level} {LEVELS.find((l) => l.level === row.level)?.name}
                      </td>
                      <td className="num">{row.asked}</td>
                      <td className="num">{row.asked ? `${Math.round(row.score * 100)}%` : '–'}</td>
                      <td>
                        {row.asked === 0 ? (
                          <span className="muted">Not tested</span>
                        ) : (
                          <span className={`status-pill ${row.score >= PASS_SHARE ? 'correct' : 'wrong'}`}>
                            {row.score >= PASS_SHARE ? 'Passed' : 'Not passed yet'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="tiles">
            <div className="tile">
              <div className="tile-label">Questions</div>
              <div className="tile-value">{results.length}</div>
              <div className="tile-sub">{total - results.length > 0 ? `${total - results.length} skipped` : 'none skipped'}</div>
            </div>
            <div className="tile">
              <div className="tile-label">Average score</div>
              <div className="tile-value">{results.length ? `${Math.round(avg * 100)}%` : '–'}</div>
              <div className="tile-sub">
                {perfect} of {results.length} fully correct
              </div>
            </div>
            <div className="tile">
              <div className="tile-label">Time</div>
              <div className="tile-value" style={{ fontSize: 22, paddingTop: 6 }}>
                {minutes(elapsed)}
              </div>
              <div className="tile-sub">from start to finish</div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="card">
              <h2>What you covered</h2>
              <table className="plain">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Type</th>
                    <th className="num">Score</th>
                    <th>Comes back</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const it = itemById(r.itemId);
                    return (
                      <tr key={`${r.itemId}-${i}`}>
                        <td>
                          <Link to={`/item/${r.itemId}`}>{it?.title ?? r.itemId}</Link>
                        </td>
                        <td>{it ? ALL_TYPE_LABELS[it.type] : ''}</td>
                        <td className="num">{Math.round(r.score * 100)}%</td>
                        <td>{r.nextDue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="row">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                session.end();
                navigate('/practice');
              }}
            >
              Another session
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                session.end();
                navigate('/');
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- a question ----
  return (
    <div className="page">
      <div className="session-bar">
        <span className="muted small">
          {session.index + 1} of {total}
        </span>
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${(session.index / total) * 100}%` }} />
        </div>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => {
            if (window.confirm('End this session now? Your answers so far are saved.')) {
              setFinishedAt(Date.now());
              useSession.setState({ index: total });
            }
          }}
        >
          End session
        </button>
      </div>
      <div className="card">
        <ItemRunner
          key={`${item.id}-${session.index}-${seed}`}
          item={item}
          seed={seed}
          onNext={advance}
          onSkip={advance}
          onResult={session.addResult}
          nextLabel={session.index + 1 >= total ? 'Finish' : 'Next'}
        />
      </div>
    </div>
  );
}
