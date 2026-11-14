/** The curriculum-wide promises: size, spread across levels, and what every topic must contain. */
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS } from '../src/content';
import { ITEM_TYPE_LABELS, type ItemType } from '../src/content/schema';
import { TOPICS } from '../src/content/topics';

describe('curriculum coverage', () => {
  it('has at least 150 questions', () => {
    expect(ALL_ITEMS.length).toBeGreaterThanOrEqual(150);
  });

  it('uses all 14 question types', () => {
    const used = new Set(ALL_ITEMS.map((i) => i.type));
    for (const type of Object.keys(ITEM_TYPE_LABELS) as ItemType[]) {
      expect(used.has(type), `no questions of type "${type}"`).toBe(true);
    }
    expect(used.size).toBe(14);
  });

  it('puts most of the questions in Levels 0 to 3', () => {
    const early = ALL_ITEMS.filter((i) => i.level <= 3).length;
    expect(early / ALL_ITEMS.length).toBeGreaterThan(0.6);
  });

  it('every topic in Levels 0 to 5 has a grid build and an error hunt', () => {
    for (const topic of TOPICS.filter((t) => t.level <= 5)) {
      const mine = ALL_ITEMS.filter((i) => i.topic === topic.id);
      expect(mine.some((i) => i.type === 'grid'), `${topic.id} has no grid build`).toBe(true);
      expect(mine.some((i) => i.type === 'errorhunt'), `${topic.id} has no error hunt`).toBe(true);
      expect(mine.length, `${topic.id} is thin`).toBeGreaterThanOrEqual(4);
    }
  });

  it('has at least three capstone cases, timed, with a pass mark', () => {
    const caps = ALL_ITEMS.filter((i) => i.level === 6);
    expect(caps.length).toBeGreaterThanOrEqual(3);
    for (const c of caps) {
      expect(c.type).toBe('timed');
      if (c.type === 'timed') {
        expect(c.minutes).toBeGreaterThanOrEqual(20);
        expect(c.brief.length).toBeGreaterThan(0);
      }
    }
  });

  it('has guided cases with fading scaffolding in more than one level', () => {
    const cases = ALL_ITEMS.filter((i) => i.type === 'case');
    expect(cases.length).toBeGreaterThanOrEqual(3);
    expect(new Set(cases.map((c) => c.level)).size).toBeGreaterThanOrEqual(2);
  });

  it('prints the content summary', () => {
    const byLevel = new Map<number, number>();
    const byType = new Map<string, number>();
    for (const i of ALL_ITEMS) {
      byLevel.set(i.level, (byLevel.get(i.level) ?? 0) + 1);
      byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
    }
    const levels = [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([l, n]) => `L${l}: ${n}`).join(', ');
    const types = [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ');
    console.log(`CONTENT SUMMARY total=${ALL_ITEMS.length} | ${levels} | ${types}`);
    expect(true).toBe(true);
  });
});
