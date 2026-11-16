/**
 * The home screen: one tile per category, read from the registry. The core
 * Excel & Pro Forma course is featured at the top. Clicking a tile opens an
 * overlay that describes the category; from there you can go on to its page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, CategoryIcon, StatusChip } from '../components/CategoryBits';
import { EVERY_ITEM } from '../content';
import { CATEGORIES, TIER_LABELS, TIER_SCOPE, type Category } from '../content/categories/registry';
import { categoriesWithDue, categoryStats, dueEverywhere, type CategoryStats } from '../learn/category';
import { ALL_CATEGORIES, isNarrowScreen, startSession } from '../learn/start';
import { startOfDay } from '../learn/sm2';
import { streak } from '../learn/stats';
import { useProgress } from '../store/progress';

/** The overlay shown when a tile is clicked: what the category is, and a way on to its page. */
function CategoryOverlay({ cat, stats, onClose }: { cat: Category; stats: CategoryStats; onClose: () => void }) {
  const openRef = useRef<HTMLAnchorElement>(null);
  const isCore = cat.tier === 'CORE';
  const isBuilt = cat.status === 'built';

  useEffect(() => {
    openRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // rendered at the top of the page so it sits above everything, including the phone's bottom navigation
  return createPortal(
    <div
      className="modal-back"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cat-overlay-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // a click on the dimmed background closes it
      }}
    >
      <div className="modal cat-overlay">
        <button type="button" className="cat-overlay-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <div className="cat-overlay-head">
          <span className="cat-icon big">
            <CategoryIcon path={cat.icon} size={30} />
          </span>
          <div>
            <div className="row" style={{ marginBottom: 4 }}>
              <span className={`chip${isCore ? ' core' : ''}`}>{TIER_LABELS[cat.tier]}</span>
              <StatusChip cat={cat} />
              {stats.due > 0 && <span className="chip due">{stats.due} due</span>}
            </div>
            <h2 id="cat-overlay-title">{cat.title}</h2>
          </div>
        </div>

        <p className="cat-overlay-summary">{cat.summary}</p>

        <div className="cat-card-label">What you will learn</div>
        <ul className="objectives">
          {cat.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <dl className="facts" style={{ marginTop: 14 }}>
          <dt>Size</dt>
          <dd>{isCore ? TIER_SCOPE[cat.tier] : `${TIER_LABELS[cat.tier]}: ${TIER_SCOPE[cat.tier].toLowerCase()}`}</dd>
          <dt>Questions</dt>
          <dd>{isBuilt ? `${stats.built}, all ready` : `about ${stats.target} when finished (${stats.built} ready to try now)`}</dd>
          {!isBuilt && (
            <>
              <dt>Status</dt>
              <dd>
                <StatusChip cat={cat} />
              </dd>
            </>
          )}
          {stats.seen > 0 && (
            <>
              <dt>Your mastery</dt>
              <dd>
                {Math.round(stats.mastery * 100)}% of what is built
                {stats.due > 0 ? `, ${stats.due} review${stats.due === 1 ? '' : 's'} due` : ''}
              </dd>
            </>
          )}
        </dl>

        <div className="cat-overlay-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <Link ref={openRef} className="btn primary big" to={`/c/${cat.slug}`}>
            Go to {isCore ? 'the course' : 'this category'} →
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Tile({ cat, stats, featured = false, onOpen }: { cat: Category; stats: CategoryStats; featured?: boolean; onOpen: (cat: Category, from: HTMLElement) => void }) {
  return (
    <button
      type="button"
      className={`cat-tile${featured ? ' featured' : ''}`}
      aria-haspopup="dialog"
      aria-label={`${cat.title}. Show what this category covers.`}
      onClick={(e) => onOpen(cat, e.currentTarget)}
    >
      <div className="cat-tile-top">
        <span className="cat-icon">
          <CategoryIcon path={cat.icon} size={featured ? 28 : 22} />
        </span>
        <div className="cat-chips">
          <span className={`chip${featured ? ' core' : ''}`}>{TIER_LABELS[cat.tier]}</span>
          <StatusChip cat={cat} />
          {stats.due > 0 && <span className="chip due">{stats.due} due</span>}
        </div>
      </div>
      <div className="cat-title">{cat.title}</div>
      {featured && <p className="cat-summary">{cat.summary}</p>}
      <div className="cat-progress">
        {featured || stats.built >= stats.target ? (
          <>
            <Bar value={stats.mastery} label="Mastery" />
            <span>
              {Math.round(stats.mastery * 100)}% mastered · {stats.built} questions
            </span>
          </>
        ) : (
          <>
            <Bar value={stats.built / stats.target} label="Built" tone="build" />
            <span>
              {stats.built} of {stats.target} built
              {stats.seen > 0 ? ` · ${Math.round(stats.mastery * 100)}% mastered` : ''}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export function Home() {
  const cards = useProgress((s) => s.cards);
  const attempts = useProgress((s) => s.attempts);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<Category | null>(null);
  const openedFrom = useRef<HTMLElement | null>(null);
  const now = Date.now();

  const due = dueEverywhere(cards, now).length;
  const dueCats = categoriesWithDue(cards, now);
  const streakDays = streak(attempts, now);
  const practicedToday = attempts.some((a) => a.ts >= startOfDay(now));
  const seen = EVERY_ITEM.filter((i) => cards[i.id]?.seen).length;
  const core = CATEGORIES.find((c) => c.tier === 'CORE')!;
  const others = CATEGORIES.filter((c) => c.tier !== 'CORE');

  function mixedReview() {
    const n = startSession({ minutes: 20, mode: 'due', noGrids: isNarrowScreen(), category: ALL_CATEGORIES });
    if (n === 0) setMessage('No reviews are due right now. Open a category to learn something new.');
    else navigate('/session');
  }

  const show = (cat: Category, from: HTMLElement) => {
    openedFrom.current = from;
    setOpen(cat);
  };
  // closing puts the keyboard back on the tile that opened the overlay
  const close = useCallback(() => {
    setOpen(null);
    openedFrom.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Groundwork</h1>
          <p>Real estate development, one skill at a time. Click a category to see what it covers, or review what is due across all of them.</p>
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={mixedReview} disabled={due === 0} title="Interleaves the reviews that are due in every category">
            Mixed review{due > 0 ? ` · ${due} due` : ''}
          </button>
        </div>
      </div>

      {message && (
        <div className="toast" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div className="stack">
        <div className="tiles three">
          <div className="tile">
            <div className="tile-label">Day streak</div>
            <div className="tile-value">{streakDays}</div>
            <div className="tile-sub">{practicedToday ? 'Practiced today' : 'Practice today to extend it'}</div>
          </div>
          <div className="tile">
            <div className="tile-label">Reviews due</div>
            <div className="tile-value">{due}</div>
            <div className="tile-sub">{due === 0 ? 'Nothing waiting' : `across ${dueCats} categor${dueCats === 1 ? 'y' : 'ies'}`}</div>
          </div>
          <div className="tile">
            <div className="tile-label">Questions seen</div>
            <div className="tile-value">{seen}</div>
            <div className="tile-sub">of {EVERY_ITEM.length} available</div>
          </div>
        </div>

        <Tile cat={core} stats={categoryStats(core, cards, now)} featured onOpen={show} />

        <div>
          <h2 className="section-title">More categories</h2>
          <div className="cat-grid">
            {others.map((c) => (
              <Tile key={c.slug} cat={c} stats={categoryStats(c, cards, now)} onOpen={show} />
            ))}
          </div>
        </div>
      </div>

      {open && <CategoryOverlay cat={open} stats={categoryStats(open, cards, now)} onClose={close} />}
    </div>
  );
}
