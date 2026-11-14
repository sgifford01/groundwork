/**
 * The home screen: one tile per category, read from the registry. The core
 * Excel & Pro Forma course is featured at the top. Hovering a tile (or
 * pressing its "i" button on a touch screen) shows what the category covers.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, CategoryIcon, StatusChip } from '../components/CategoryBits';
import { EVERY_ITEM } from '../content';
import { CATEGORIES, TIER_SCOPE, type Category } from '../content/categories/registry';
import { categoriesWithDue, categoryStats, dueEverywhere, type CategoryStats } from '../learn/category';
import { ALL_CATEGORIES, isNarrowScreen, startSession } from '../learn/start';
import { startOfDay } from '../learn/sm2';
import { streak } from '../learn/stats';
import { useProgress } from '../store/progress';

function HoverCard({ cat, stats, id }: { cat: Category; stats: CategoryStats; id: string }) {
  return (
    <div className="cat-card" id={id} role="tooltip">
      <p>{cat.summary}</p>
      <div className="cat-card-label">What you will learn</div>
      <ul>
        {cat.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <dl>
        <dt>Size</dt>
        <dd>
          {cat.tier === 'CORE' ? 'Core' : `${cat.tier[0]}${cat.tier.slice(1).toLowerCase()}`}: {TIER_SCOPE[cat.tier].toLowerCase()}
        </dd>
        <dt>Questions</dt>
        <dd>{cat.tier === 'CORE' ? `${stats.built}` : `about ${stats.target} when finished (${stats.built} ready now)`}</dd>
        <dt>Status</dt>
        <dd>
          <StatusChip cat={cat} />
        </dd>
      </dl>
    </div>
  );
}

function Tile({ cat, stats, featured = false }: { cat: Category; stats: CategoryStats; featured?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cardId = `about-${cat.slug}`;

  // an opened card closes on Escape or a click elsewhere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={`cat-tile-wrap${featured ? ' featured' : ''}${open ? ' open' : ''}`}>
      <Link className="cat-tile" to={`/c/${cat.slug}`} aria-describedby={cardId}>
        <div className="cat-tile-top">
          <span className="cat-icon">
            <CategoryIcon path={cat.icon} size={featured ? 28 : 22} />
          </span>
          <div className="cat-chips">
            {featured && <span className="chip core">Core</span>}
            {!featured && <span className="chip">{cat.tier[0] + cat.tier.slice(1).toLowerCase()}</span>}
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
      </Link>
      <button type="button" className="cat-info" aria-label={`About ${cat.title}`} aria-expanded={open} aria-controls={cardId} onClick={() => setOpen((o) => !o)}>
        i
      </button>
      <HoverCard cat={cat} stats={stats} id={cardId} />
    </div>
  );
}

export function Home() {
  const cards = useProgress((s) => s.cards);
  const attempts = useProgress((s) => s.attempts);
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Groundwork</h1>
          <p>Real estate development, one skill at a time. Pick a category, or review what is due across all of them.</p>
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

        <Tile cat={core} stats={categoryStats(core, cards, now)} featured />

        <div>
          <h2 className="section-title">More categories</h2>
          <div className="cat-grid">
            {others.map((c) => (
              <Tile key={c.slug} cat={c} stats={categoryStats(c, cards, now)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
