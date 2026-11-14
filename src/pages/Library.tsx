/** Every question, grouped by level and topic. Open any one directly. */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ItemRunner } from '../components/ItemRunner';
import { SubtopicList } from '../components/CategoryBits';
import { ALL_ITEMS, EVERY_ITEM, itemById, itemsOfCategory } from '../content';
import { CATEGORIES, categoryBySlug, CORE_CATEGORY } from '../content/categories/registry';
import { ALL_TYPE_LABELS, type Item, type ItemType } from '../content/schema';
import { LEVELS, TOPICS } from '../content/topics';
import { newSeed } from '../engine/rng';
import { isLevelUnlocked, levelHasContent, levelMastery, topicMastery, UNLOCK_AT } from '../learn/mastery';
import { describeInterval, type CardState } from '../learn/sm2';
import { useProgress } from '../store/progress';

function ItemState({ card, now }: { card: CardState | undefined; now: number }) {
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

export function Library() {
  const cards = useProgress((s) => s.cards);
  const manualLevel = useProgress((s) => s.settings.manualLevel);
  const updateSettings = useProgress((s) => s.updateSettings);
  const now = Date.now();
  const [category, setCategory] = useState(CORE_CATEGORY);
  const [type, setType] = useState<ItemType | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'new' | 'due' | 'weak'>('all');
  const levels = LEVELS.filter((l) => levelHasContent(l.level, ALL_ITEMS));
  const typeCounts = new Map<ItemType, number>();
  for (const i of ALL_ITEMS) typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1);
  const shown = (i: Item): boolean => {
    if (type !== 'all' && i.type !== type) return false;
    const card = cards[i.id];
    if (status === 'new') return !card?.seen;
    if (status === 'due') return Boolean(card?.seen) && card.due <= now;
    if (status === 'weak') return Boolean(card?.seen) && card.mastery < 0.8;
    return true;
  };
  const visible = ALL_ITEMS.filter(shown);

  const picker = (
    <label className="field">
      Category
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.title} ({itemsOfCategory(c.slug).length})
          </option>
        ))}
      </select>
    </label>
  );

  // Every category except the core course is listed by subtopic, straight from the registry.
  const other = category === CORE_CATEGORY ? undefined : categoryBySlug(category);
  if (other) {
    return (
      <div className="page narrow">
        <div className="page-head">
          <div>
            <h1>Library</h1>
            <p>
              {itemsOfCategory(other.slug).length} of about {other.targetItems} questions built in {other.title}.{' '}
              <Link to={`/c/${other.slug}`}>Open the category page</Link>
            </p>
          </div>
        </div>
        <div className="filters" style={{ marginBottom: 18 }}>
          {picker}
        </div>
        <SubtopicList cat={other} cards={cards} now={now} />
      </div>
    );
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Library</h1>
          <p>
            {ALL_ITEMS.length} questions. A level opens when the ones before it reach {Math.round(UNLOCK_AT * 100)}% mastery, or
            you can jump ahead.
          </p>
        </div>
      </div>
      <div className="filters" style={{ marginBottom: 18 }}>
        {picker}
        <label className="field">
          Question type
          <select value={type} onChange={(e) => setType(e.target.value as ItemType | 'all')}>
            <option value="all">All types ({ALL_ITEMS.length})</option>
            {[...typeCounts.entries()].map(([t, n]) => (
              <option key={t} value={t}>
                {ALL_TYPE_LABELS[t]} ({n})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Everything</option>
            <option value="new">Not seen yet</option>
            <option value="due">Due for review</option>
            <option value="weak">Seen, below 80%</option>
          </select>
        </label>
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          Showing {visible.length} of {ALL_ITEMS.length}
        </span>
      </div>
      {visible.length === 0 && <div className="empty">No questions match those filters.</div>}
      <div className="stack">
        {levels.map((l) => {
          const unlocked = isLevelUnlocked(l.level, manualLevel, ALL_ITEMS, cards);
          if (!visible.some((i) => i.level === l.level)) return null;
          return (
            <section key={l.level} className="stack">
              <div className="spread">
                <h2>
                  <span className="chip accent">L{l.level}</span> {l.name}{' '}
                  <span className="muted small">· {Math.round(levelMastery(l.level, ALL_ITEMS, cards) * 100)}% mastered</span>
                </h2>
                {!unlocked && (
                  <button type="button" className="btn small" onClick={() => updateSettings({ manualLevel: l.level })}>
                    Locked. Jump ahead
                  </button>
                )}
              </div>
              {TOPICS.filter((t) => t.level === l.level && visible.some((i) => i.topic === t.id)).map((t) => (
                <div className="card" key={t.id} style={{ opacity: unlocked ? 1 : 0.6 }}>
                  <div className="spread">
                    <h3>{t.name}</h3>
                    <span className="muted small">{Math.round(topicMastery(t.id, ALL_ITEMS, cards) * 100)}%</span>
                  </div>
                  <p className="muted small" style={{ marginBottom: 8 }}>
                    {t.blurb}
                  </p>
                  <div className="item-list">
                    {visible
                      .filter((i) => i.topic === t.id)
                      .map((item) => (
                      <Link key={item.id} className="item-row" to={`/item/${item.id}`}>
                        <span className="chip">{ALL_TYPE_LABELS[item.type]}</span>
                        <span>{item.title}</span>
                        <ItemState card={cards[item.id]} now={now} />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** One question on its own page, repeatable with fresh numbers. */
export function ItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const item: Item | undefined = itemById(id ?? '');
  const [seed, setSeed] = useState(() => newSeed());

  if (!item) {
    return (
      <div className="page narrow">
        <div className="card">
          <h2>Question not found</h2>
          <Link className="btn" to="/library">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }

  const peers = EVERY_ITEM.filter((i) => i.topic === item.topic);
  const isCore = item.category === CORE_CATEGORY;
  const next = peers[peers.findIndex((i) => i.id === item.id) + 1];

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className="btn small" to={isCore ? '/library' : `/c/${item.category}`}>
          ← {isCore ? 'Library' : (categoryBySlug(item.category)?.title ?? 'Category')}
        </Link>
        {next && (
          <button type="button" className="btn small ghost" onClick={() => navigate(`/item/${next.id}`)}>
            Next in this topic →
          </button>
        )}
      </div>
      <div className="card">
        <ItemRunner
          key={`${item.id}-${seed}`}
          item={item}
          seed={seed}
          nextLabel={item.type === 'flashcard' ? 'Again' : 'Try again with new numbers'}
          onNext={() => setSeed(newSeed())}
        />
      </div>
    </div>
  );
}
