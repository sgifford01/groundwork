/**
 * A category's landing page, built entirely from the registry: what it is,
 * what you will learn, its subtopics, how much is built and how well you know
 * it. The core course shows its full dashboard here instead of a subtopic list.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, CategoryIcon, StatusChip, SubtopicList } from '../components/CategoryBits';
import { categoryBySlug, CORE_CATEGORY, TIER_SCOPE } from '../content/categories/registry';
import { categoryStats } from '../learn/category';
import { isNarrowScreen, startSession } from '../learn/start';
import type { SessionMode } from '../learn/session';
import { useProgress } from '../store/progress';
import { Dashboard } from './Dashboard';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const cat = categoryBySlug(slug);
  const cards = useProgress((s) => s.cards);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const now = Date.now();

  if (!cat) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>Category not found</h2>
          <Link className="btn" to="/">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const isCore = cat.slug === CORE_CATEGORY;
  const stats = categoryStats(cat, cards, now);

  function go(minutes: number, mode: SessionMode) {
    const n = startSession({ minutes, mode, noGrids: isNarrowScreen(), category: cat!.slug });
    if (n === 0) setMessage(mode === 'due' ? 'No reviews are due in this category right now.' : 'Nothing to practice here right now.');
    else navigate('/session');
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className="btn small" to="/">
          ← All categories
        </Link>
      </div>

      <div className="cat-head">
        <span className="cat-icon big">
          <CategoryIcon path={cat.icon} size={30} />
        </span>
        <div>
          <div className="row" style={{ marginBottom: 4 }}>
            {isCore ? <span className="chip core">Core</span> : <span className="chip">{cat.tier[0] + cat.tier.slice(1).toLowerCase()}</span>}
            <StatusChip cat={cat} />
          </div>
          <h1>{cat.title}</h1>
          <p className="cat-desc">{cat.description}</p>
        </div>
      </div>

      {message && (
        <div className="toast" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      {isCore ? (
        <Dashboard embedded />
      ) : (
        <div className="stack">
          {cat.status !== 'built' && (
            <div className="banner">
              <strong>{cat.status === 'planned' ? 'Coming soon.' : 'Being built.'}</strong>{' '}
              {stats.built > 0
                ? `${stats.built} sample question${stats.built === 1 ? ' is' : 's are'} ready to try now. The full category will have about ${cat.targetItems}.`
                : `The full category will have about ${cat.targetItems} questions.`}
            </div>
          )}

          <div className="tiles three">
            <div className="tile">
              <div className="tile-label">Built</div>
              <div className="tile-value">
                {stats.built} <span className="tile-of">of {stats.target}</span>
              </div>
              <Bar value={stats.target ? stats.built / stats.target : 0} label="Questions built" tone="build" />
            </div>
            <div className="tile">
              <div className="tile-label">Mastery of what is built</div>
              <div className="tile-value">{Math.round(stats.mastery * 100)}%</div>
              <Bar value={stats.mastery} label="Mastery" />
            </div>
            <div className="tile">
              <div className="tile-label">Reviews due</div>
              <div className="tile-value">{stats.due}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button type="button" className="btn small" disabled={stats.due === 0} onClick={() => go(20, 'due')}>
                  Review due
                </button>
                <button type="button" className="btn small primary" disabled={stats.built === 0} onClick={() => go(10, 'mixed')}>
                  Practice
                </button>
              </div>
            </div>
          </div>

          <div className="cols-2">
            <div className="card">
              <h2>What you will be able to do</h2>
              <ul className="objectives">
                {cat.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2>About this category</h2>
              <dl className="facts">
                <dt>Size</dt>
                <dd>{TIER_SCOPE[cat.tier]}</dd>
                <dt>Covers</dt>
                <dd>
                  <ul className="objectives">
                    {cat.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </dd>
                {cat.needsLegalVerification && (
                  <>
                    <dt>Sources</dt>
                    <dd>Laws and fees change. Every rule in this category is checked against an official source when it is written, and shows the date it was checked.</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div>
            <h2 className="section-title">Subtopics</h2>
            <SubtopicList cat={cat} cards={cards} now={now} />
          </div>
        </div>
      )}
    </div>
  );
}
