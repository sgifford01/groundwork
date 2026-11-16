/** Small pieces shared by the home screen, the category pages and the library. */
import { Link } from 'react-router-dom';
import { CATEGORY_LEVELS, STATUS_LABELS, type Category } from '../content/categories/registry';
import { ALL_TYPE_LABELS } from '../content/schema';
import { learningOrder } from '../learn/category';
import { describeInterval, type CardState } from '../learn/sm2';
import type { Cards } from '../learn/mastery';

export function CategoryIcon({ path, size = 22 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** "Coming soon" or "Being built". A finished category shows no status at all: there is nothing left to build. */
export function StatusChip({ cat }: { cat: Category }) {
  if (cat.status === 'built') return null;
  return <span className={`chip status-${cat.status}`}>{STATUS_LABELS[cat.status]}</span>;
}

/** A labelled bar from 0 to 1. `tone` picks mastery (blue) or build progress (grey). */
export function Bar({ value, label, tone = 'mastery' }: { value: number; label: string; tone?: 'mastery' | 'build' }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`bar ${tone}`} role="img" aria-label={`${label}: ${pct}%`}>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ItemState({ card, now }: { card: CardState | undefined; now: number }) {
  if (!card || card.seen === 0) {
    return (
      <span className="state">
        <i className="dot" />
        New
      </span>
    );
  }
  const tone = card.mastery >= 0.8 ? 'good' : card.mastery >= 0.4 ? 'mid' : 'low';
  return (
    <span className="state">
      <i className={`dot ${tone}`} />
      {Math.round(card.mastery * 100)}% · {card.due <= now ? 'due now' : `due ${describeInterval(card, now)}`}
    </span>
  );
}

/** A category's subtopics with built / target counts and its playable questions. */
export function SubtopicList({ cat, cards, now }: { cat: Category; cards: Cards; now: number }) {
  // listed in the order the category is meant to be learned (the same order as "Next up")
  const items = learningOrder(cat.slug);
  const built = cat.status === 'built';
  return (
    <div className="stack">
      {cat.subtopics.map((t) => {
        const mine = items.filter((i) => i.topic === t.id);
        return (
          <div className="card subtopic" key={t.id}>
            <div className="spread">
              <h3>
                {t.name} <span className="chip">{CATEGORY_LEVELS[t.level]}</span>
              </h3>
              <span className="muted small">
                {built ? `${mine.length} question${mine.length === 1 ? '' : 's'}` : `${mine.length} of ${t.target} built`}
              </span>
            </div>
            <p className="muted small" style={{ marginBottom: 8 }}>
              {t.blurb}
            </p>
            {mine.length === 0 ? (
              <div className="coming-soon">Coming soon</div>
            ) : (
              <div className="item-list">
                {mine.map((item) => (
                  <Link key={item.id} className="item-row" to={`/item/${item.id}`}>
                    <span className="chip">{ALL_TYPE_LABELS[item.type]}</span>
                    <span>{item.title}</span>
                    <ItemState card={cards[item.id]} now={now} />
                  </Link>
                ))}
                {!built && mine.length < t.target && <div className="coming-soon inline">{t.target - mine.length} more coming</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
