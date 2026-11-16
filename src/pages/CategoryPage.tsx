/**
 * A category's landing page, built entirely from the registry: what it is,
 * the next question to work on, how much is built and how well you know it,
 * and its subtopics. (What it covers and its size are in the home screen's
 * popup, not repeated here.) The core course shows its full dashboard here
 * instead of a subtopic list.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, CategoryIcon, StatusChip, SubtopicList } from '../components/CategoryBits';
import { categoryBySlug, CORE_CATEGORY, TIER_LABELS, type Category } from '../content/categories/registry';
import { ALL_TYPE_LABELS } from '../content/schema';
import { categoryStats, isSolved, learningOrder, topicLabel } from '../learn/category';
import type { Cards } from '../learn/mastery';
import { isNarrowScreen, startSession } from '../learn/start';
import type { SessionMode } from '../learn/session';
import { useProgress } from '../store/progress';
import { Dashboard } from './Dashboard';

/**
 * "Next up": the first question, in the order the category is meant to be
 * learned, that has not been solved yet. Solved = answered fully right once,
 * or mastery of at least 80%.
 */
function NextUp({ cat, cards, dueCount, onReview }: { cat: Category; cards: Cards; dueCount: number; onReview: () => void }) {
  const order = learningOrder(cat.slug);
  if (order.length === 0) return null;
  const solved = order.filter((i) => isSolved(cards[i.id])).length;
  const next = order.find((i) => !isSolved(cards[i.id]));
  return (
    <div className="card next-up">
      <div className="next-up-text">
        <div className="tile-label">
          Next up · {solved} of {order.length} solved
        </div>
        {next ? (
          <>
            <div className="next-up-title">{next.title}</div>
            <div className="muted small">
              {topicLabel(next.topic)} · {ALL_TYPE_LABELS[next.type]}
            </div>
          </>
        ) : (
          <div className="next-up-title">You have solved every question here.</div>
        )}
        <Bar value={solved / order.length} label="Questions solved" />
      </div>
      {next ? (
        <Link className="btn primary big" to={`/item/${next.id}`}>
          Next unsolved question →
        </Link>
      ) : (
        <button type="button" className="btn primary big" disabled={dueCount === 0} onClick={onReview}>
          {dueCount === 0 ? 'Nothing due to review' : `Review ${dueCount} due`}
        </button>
      )}
    </div>
  );
}

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
  const isBuilt = cat.status === 'built';
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
            <span className={`chip${isCore ? ' core' : ''}`}>{TIER_LABELS[cat.tier]}</span>
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
        <div className="stack">
          <NextUp cat={cat} cards={cards} dueCount={stats.due} onReview={() => go(20, 'due')} />
          <Dashboard embedded />
        </div>
      ) : (
        <div className="stack">
          {!isBuilt && (
            <div className="banner">
              <strong>{cat.status === 'planned' ? 'Coming soon.' : 'Being built.'}</strong>{' '}
              {stats.built > 0
                ? `${stats.built} question${stats.built === 1 ? ' is' : 's are'} ready to try now. The full category will have about ${cat.targetItems}.`
                : `The full category will have about ${cat.targetItems} questions.`}
            </div>
          )}

          <NextUp cat={cat} cards={cards} dueCount={stats.due} onReview={() => go(20, 'due')} />

          {/* a finished category has nothing left to build, so it shows no "built" box */}
          <div className={`tiles ${isBuilt ? 'two' : 'three'}`}>
            {!isBuilt && (
              <div className="tile">
                <div className="tile-label">Built</div>
                <div className="tile-value">
                  {stats.built} <span className="tile-of">of {stats.target}</span>
                </div>
                <Bar value={stats.target ? stats.built / stats.target : 0} label="Questions built" tone="build" />
              </div>
            )}
            <div className="tile">
              <div className="tile-label">{isBuilt ? 'Mastery' : 'Mastery of what is built'}</div>
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

          {/* What the category covers, its size and its sources are in the popup that opens from the home screen. */}
          <div>
            <h2 className="section-title">Subtopics</h2>
            <SubtopicList cat={cat} cards={cards} now={now} />
          </div>
        </div>
      )}
    </div>
  );
}
