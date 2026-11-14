/**
 * The category system: the registry, the build specs, per-category progress
 * and sessions, and independent checks of the seed questions' arithmetic.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, CATEGORY_ITEMS, EVERY_ITEM, itemById, itemsOfCategory } from '../src/content';
import { CATEGORIES, CATEGORY_TOPICS, categoryBySlug, CORE_CATEGORY, type Category } from '../src/content/categories/registry';
import { renderBlock, solveExample, SPEC_BLOCKS, SPEC_DATA, syncSpec } from '../src/content/categories/specs';
import { ALL_TYPE_LABELS, DESKTOP_ONLY_TYPES, ITEM_TYPE_LABELS, type NumericItem, type PlanQItem } from '../src/content/schema';
import { TOPICS } from '../src/content/topics';
import { mulberry32, seededRng } from '../src/engine/rng';
import { sampleVars } from '../src/engine/variables';
import { evalFormula } from '../src/engine/workbook';
import { gradeDocReview, gradeMeasure, planFor } from '../src/grading/category';
import { numericAnswer } from '../src/grading/simple';
import { ALL_TOPICS, categoriesWithDue, categoryStats, dueEverywhere, statusRows, topicLabel } from '../src/learn/category';
import type { Cards } from '../src/learn/mastery';
import { buildSession, dueItems, newItems } from '../src/learn/session';
import { newCard, type CardState } from '../src/learn/sm2';
import { STORAGE_KEY } from '../src/store/progress';
import { irr, pmt } from './finance';

const others = CATEGORIES.filter((c) => c.slug !== CORE_CATEGORY);
const NOW = new Date(2026, 10, 14, 12, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;
const TIER_TARGET: Record<string, [number, number]> = { BIG: [70, 70], MEDIUM: [40, 40], SMALL: [20, 25] };
const specPath = (slug: string) => resolve('src/content/categories', slug, 'BUILD_SPEC.md');

function seen(mastery: number, due: number): CardState {
  return { ...newCard(), seen: 1, correct: 1, reps: 1, interval: 1, mastery, due, last: NOW - DAY };
}

describe('category registry', () => {
  it('has the core course plus the eight new categories, with unique slugs', () => {
    expect(CATEGORIES.map((c) => c.slug)).toEqual([
      'excel-proforma',
      'argus',
      'plan-reading',
      'entitlements',
      'market-analysis',
      'acquisitions',
      'capital-markets',
      'asset-management',
      'construction',
    ]);
    expect(CATEGORIES.filter((c) => c.tier === 'CORE').map((c) => c.slug)).toEqual([CORE_CATEGORY]);
  });

  for (const cat of CATEGORIES) {
    it(`${cat.slug}: has everything the tiles and landing page need`, () => {
      expect(/^[a-z]+(-[a-z]+)*$/.test(cat.slug)).toBe(true);
      expect(cat.title.length).toBeGreaterThan(3);
      expect(cat.summary.length).toBeGreaterThan(40);
      expect(cat.summary.split(/(?<=[.!?])\s+/).length, 'hover summary is one or two sentences').toBeLessThanOrEqual(2);
      expect(cat.bullets.length).toBeGreaterThanOrEqual(4);
      expect(cat.bullets.length).toBeLessThanOrEqual(6);
      expect(cat.description.length).toBeGreaterThan(60);
      expect(cat.objectives.length).toBeGreaterThanOrEqual(4);
      expect(cat.icon.startsWith('M')).toBe(true);
      expect(['planned', 'in-progress', 'built']).toContain(cat.status);
      expect(JSON.stringify(cat).includes('—'), 'no em dashes').toBe(false);
    });
  }

  for (const cat of others) {
    it(`${cat.slug}: subtopics add up to the tier target and are named after the category`, () => {
      const [min, max] = TIER_TARGET[cat.tier];
      expect(cat.targetItems).toBeGreaterThanOrEqual(min);
      expect(cat.targetItems).toBeLessThanOrEqual(max);
      expect(cat.subtopics.reduce((n, t) => n + t.target, 0)).toBe(cat.targetItems);
      for (const t of cat.subtopics) {
        expect(t.id.startsWith(`${cat.slug}-`), t.id).toBe(true);
        expect(t.target).toBeGreaterThan(0);
      }
      const levels = new Set(cat.subtopics.map((t) => t.level));
      if (cat.tier === 'SMALL') expect([...levels]).toEqual([1]);
      else {
        expect(levels.has(1) && levels.has(2), 'two difficulty levels').toBe(true);
        const cases = cat.subtopics.filter((t) => t.level === 3);
        expect(cases.length, 'exactly one case subtopic').toBe(1);
        expect(cases[0].target).toBe(1);
      }
      expect(cat.objectives.every((o) => o.startsWith('Given ')), 'objectives are "Given X, the student can Y"').toBe(true);
    });
  }

  it('subtopic ids are unique and never collide with a core topic', () => {
    const ids = CATEGORY_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const core = new Set<string>(TOPICS.map((t) => t.id));
    for (const id of ids) expect(core.has(id), id).toBe(false);
  });

  it('recommends the build model the owner asked for', () => {
    const want: Record<string, string> = {
      'plan-reading': 'Fable 5.2 high',
      argus: 'Fable 5.2 high',
      'market-analysis': 'Opus 5.5 high',
      acquisitions: 'Opus 5.5 high',
      'asset-management': 'Opus 5.5 high',
      entitlements: 'Opus 5.5 high',
      'capital-markets': 'Opus 5.5 medium',
      construction: 'Opus 5.5 medium',
    };
    for (const cat of others) expect(`${cat.build.model} ${cat.build.effort}`, cat.slug).toBe(want[cat.slug]);
    expect(others.filter((c) => c.needsLegalVerification).map((c) => c.slug)).toEqual(['entitlements']);
  });

  it('a category marked built has reached its target; one with questions beyond the seeds is not still "planned"', () => {
    for (const cat of others) {
      const built = itemsOfCategory(cat.slug).length;
      if (cat.status === 'built') expect(built, `${cat.slug} is marked built`).toBeGreaterThanOrEqual(cat.targetItems);
      if (cat.status === 'planned') expect(built, `${cat.slug} has real content: set status to in-progress`).toBeLessThanOrEqual(2);
      expect(built, `${cat.slug} is over its target`).toBeLessThanOrEqual(cat.targetItems + 3);
    }
  });
});

describe('seed questions', () => {
  for (const cat of others) {
    it(`${cat.slug}: at least two, with one interactive or sheet-graded`, () => {
      const items = itemsOfCategory(cat.slug);
      expect(items.length).toBeGreaterThanOrEqual(2);
      const interactive = ['grid', 'formula', 'case', 'timed', 'errorhunt', 'plan', 'docreview', 'predict'];
      expect(items.some((i) => interactive.includes(i.type)), 'needs an interactive or Excel-gradable seed').toBe(true);
      for (const i of items) expect(itemById(i.id)).toBe(i);
    });

    it(`${cat.slug}: no subtopic is over its target`, () => {
      const items = itemsOfCategory(cat.slug);
      for (const t of cat.subtopics) {
        expect(items.filter((i) => i.topic === t.id).length, t.id).toBeLessThanOrEqual(t.target);
      }
    });
  }

  it('the three new question types each have a working example', () => {
    for (const type of ['plan', 'docreview', 'judgment'] as const) {
      expect(CATEGORY_ITEMS.some((i) => i.type === type), type).toBe(true);
      expect(ALL_TYPE_LABELS[type]).toBeTruthy();
      expect(type in ITEM_TYPE_LABELS, `${type} must stay out of the core labels`).toBe(false);
    }
    expect(Object.keys(ITEM_TYPE_LABELS).length, 'the core course still has exactly 14 types').toBe(14);
    expect(DESKTOP_ONLY_TYPES).toContain('plan');
  });
});

// The graders already check each answer key against itself under random inputs.
// These recompute the seed answers a second way, in plain TypeScript.
describe('seed answers, recomputed independently', () => {
  const numeric = (id: string) => itemById(id) as NumericItem;
  const draws = (item: NumericItem) => Array.from({ length: 40 }, (_, s) => sampleVars(item.vars, seededRng(item.id, s + 1)) as Record<string, number>);

  it('argus: escalated rent', () => {
    const item = numeric('argus-baserent-numeric-escalated-year');
    for (const v of draws(item)) {
      let rent = v.rent;
      for (let year = 2; year <= v.yr; year++) rent *= 1 + v.bump; // escalate once at the start of each later year
      expect(numericAnswer(item, v)).toBeCloseTo(v.sf * rent, 4);
    }
  });

  it('entitlements: expected carry', () => {
    const item = numeric('entitlements-risk-numeric-expected-carry');
    for (const v of draws(item)) {
      const noAppeal = v.carry * v.base;
      const appeal = v.carry * (v.base + v.extra);
      expect(numericAnswer(item, v)).toBeCloseTo((1 - v.prob) * noAppeal + v.prob * appeal, 4);
    }
  });

  it('market analysis: months to stabilise', () => {
    const item = numeric('market-analysis-absorption-numeric-months-to-stabilise');
    for (const v of draws(item)) {
      // simulate month by month until vacancy is back to the stabilised rate
      const inventory = v.inventory + v.pipeline;
      let vacant = v.vacant + v.pipeline;
      const target = v.stab * inventory;
      expect(vacant).toBeGreaterThan(target);
      let months = 0;
      while (vacant - v.absorb >= target) {
        vacant -= v.absorb;
        months++;
      }
      months += (vacant - target) / v.absorb;
      expect(numericAnswer(item, v)).toBeCloseTo(months, 6);
    }
  });

  it('plan reading: efficiency equals drawn unit area over drawn floor area', () => {
    const item = itemById('plan-reading-program-measure-efficiency') as PlanQItem;
    for (let seed = 1; seed <= 12; seed++) {
      const set = planFor(item, seed);
      const floor = set.sheets.find((s) => s.id === 'A-201')!;
      const unitArea = floor.elements.filter((e) => e.role === 'unit').reduce((n, e) => n + (e.area ?? 0), 0);
      const efficiency = unitArea / (set.facts.building_length * set.facts.building_depth);
      expect(gradeMeasure(item, set, String(efficiency)).correct).toBe(true);
      expect(gradeMeasure(item, set, String(efficiency + 0.02)).correct).toBe(false);
    }
  });

  it('document reviews: flagging exactly the planted problems scores 100%', () => {
    for (const id of ['acquisitions-underwriting-docreview-t12-normalise', 'construction-draws-docreview-pay-application']) {
      const item = itemById(id);
      if (!item || item.type !== 'docreview') throw new Error(id);
      expect(gradeDocReview(item, item.issues.flatMap((i) => i.lines)).score).toBe(1);
    }
  });
});

describe('build specs', () => {
  const HEADINGS = [
    '## 1. Purpose and career fit',
    '## 2. Learning objectives',
    '## 3. Subtopic outline and item counts',
    '## 4. Key concepts, definitions and formulas',
    '## 5. Common misconceptions',
    '## 6. Question-type mix',
    '## 7. Grid and interactive tasks',
    '## 8. Error hunts and spot-the-problem scenarios',
    '## 9. Case study',
    '## 10. Illustrative assumption ranges',
    '## 11. Facts to verify at build time',
    '## 12. Concept ownership',
    '## 13. ',
    '## 14. Definition of done',
    '## 15. Build plan (chunks)',
    '## 16. BUILD PROMPT',
  ];

  for (const cat of others) {
    describe(cat.slug, () => {
      const data = SPEC_DATA[cat.slug];
      const text = existsSync(specPath(cat.slug)) ? readFileSync(specPath(cat.slug), 'utf8') : '';

      it('exists with all sixteen sections, in order', () => {
        expect(text.length, `missing ${specPath(cat.slug)}`).toBeGreaterThan(2000);
        let at = -1;
        for (const h of HEADINGS) {
          const next = text.indexOf(`\n${h}`);
          expect(next, `missing section "${h}"`).toBeGreaterThan(at);
          at = next;
        }
      });

      it('is in sync with the registry and spec-data.ts (run `npm run sync-specs`)', () => {
        expect(data, `missing spec-data.ts for ${cat.slug}`).toBeDefined();
        expect(syncSpec(text, cat, data)).toBe(text);
        for (const block of SPEC_BLOCKS) expect(text).toContain(renderBlock(block, cat, data));
      });

      it('worked examples all evaluate, with unique ids and enough of them', () => {
        expect(data.examples.length).toBeGreaterThanOrEqual(8);
        expect(new Set(data.examples.map((e) => e.id)).size).toBe(data.examples.length);
        for (const ex of data.examples) {
          const solved = solveExample(ex);
          expect(Object.keys(solved.values).length).toBe(ex.steps.length);
          const names = [...ex.given.map((g) => g.name), ...ex.steps.map((s) => s.name)];
          expect(new Set(names).size, `${ex.id}: names must be unique`).toBe(names.length);
          for (const n of names) expect(/^[a-z][a-z_]*[a-z]$/.test(n), `${ex.id}: "${n}" is not a valid formula name`).toBe(true);
          // every step must use its inputs: changing a given must be able to change something
          expect(ex.steps.every((s) => /[a-z]/.test(s.formula)), `${ex.id}: a step has no names in it`).toBe(true);
        }
      });

      it('type mix and chunk plan add up to the target', () => {
        expect(Object.values(data.typeMix).reduce((a, b) => a + b, 0), 'type mix').toBe(cat.targetItems);
        expect(data.chunks.reduce((n, c) => n + c.items, 0), 'chunks').toBe(cat.targetItems);
        expect(data.chunks[0].items, 'chunk 0 is the seeds').toBe(2);
        for (const c of data.chunks.slice(1)) expect(c.items, `${c.title} is too big for one session`).toBeLessThanOrEqual(25);
        // the seeds named in chunk 0 are the real seed ids
        for (const seed of itemsOfCategory(cat.slug).slice(0, 2)) expect(data.chunks[0].scope, seed.id).toContain(seed.id);
      });

      it('names every subtopic, the build model, the protection rule and the legal flag', () => {
        for (const t of cat.subtopics) expect(text, t.id).toContain(`\`${t.id}\``);
        expect(text).toContain(`Model: ${cat.build.model}, ${cat.build.effort} effort`);
        expect(text).toContain('Never edit the Excel & Pro Forma section');
        expect(text).toContain('npm run validate');
        expect(text).toContain('**Owns');
        expect(text).toContain('**Mentions only');
        if (cat.needsLegalVerification) {
          expect(text).toContain('verifiedAsOf');
          expect(text).toContain('sourceUrl');
          expect(text).toContain('VERIFICATION_LOG.md');
        }
        expect(text.includes('—'), 'no em dashes').toBe(false);
      });
    });
  }

  it('no concept is claimed by two categories', () => {
    // each spec lists what it owns after "**Owns" ; a subtopic id of one category must not appear in another's Owns line
    for (const a of others) {
      const text = readFileSync(specPath(a.slug), 'utf8');
      const owns = text.slice(text.indexOf('**Owns'), text.indexOf('**Mentions only'));
      for (const b of others) {
        if (a === b) continue;
        for (const t of b.subtopics) expect(owns.includes(t.id), `${a.slug} claims ${t.id}`).toBe(false);
      }
    }
  });

  it('finance in the worked examples matches independent textbook implementations', () => {
    const solved = (slug: string, id: string) => solveExample(SPEC_DATA[slug].examples.find((e) => e.id === id)!);
    const given = (slug: string, id: string) => Object.fromEntries(SPEC_DATA[slug].examples.find((e) => e.id === id)!.given.map((g) => [g.name, g.value]));

    // loan sized by DSCR: the payment on that loan must equal NOI / DSCR
    const size = solved('capital-markets', 'cap-ex-sizing').values;
    const sg = given('capital-markets', 'cap-ex-sizing');
    expect(-pmt(sg.rate / 12, sg.amort_years * 12, size.by_dscr) * 12).toBeCloseTo(sg.noi / sg.min_dscr, 2);
    expect(size.loan).toBe(Math.min(size.by_ltv, size.by_dscr, size.by_dy));

    // loan constant
    const lev = solved('capital-markets', 'cap-ex-leverage').values;
    const lg = given('capital-markets', 'cap-ex-leverage');
    expect(lev.debt_service).toBeCloseTo(-pmt(lg.rate / 12, lg.amort_years * 12, lev.loan) * 12, 2);

    // hold IRR
    const hold = solved('asset-management', 'am-ex-hold-sell').values;
    const hg = given('asset-management', 'am-ex-hold-sell');
    expect(hold.hold_irr).toBeCloseTo(irr([-hg.net_today, hg.cf_a, hg.cf_b, hg.cf_c + hg.net_later]), 6);

    // valuation: discount each year by hand
    const val = solved('argus', 'argus-ex-valuation').values;
    const vg = given('argus', 'argus-ex-valuation');
    const flows = [vg.cf_a, vg.cf_b, vg.cf_c, vg.cf_d, vg.cf_e + val.net_resale];
    expect(val.pv).toBeCloseTo(flows.reduce((n, cf, i) => n + cf / (1 + vg.disc) ** (i + 1), 0), 2);

    // capital stack losses never exceed the fall in value, and add up to it
    const loss = solved('capital-markets', 'cap-ex-loss').values;
    const og = given('capital-markets', 'cap-ex-loss');
    expect(loss.equity_left + loss.mezz_recovery + loss.senior_recovery).toBeCloseTo(loss.new_value, 2);
    expect(loss.new_value).toBeCloseTo(og.value * (1 - og.decline), 2);
  });
});

describe('progress and sessions per category', () => {
  it('the storage key is unchanged, so saved progress survives the rename', () => {
    expect(STORAGE_KEY).toBe('pro-forma-gym/v1');
  });

  it('itemsOfCategory splits the question bank cleanly', () => {
    expect(itemsOfCategory(CORE_CATEGORY)).toBe(ALL_ITEMS);
    const total = CATEGORIES.reduce((n, c) => n + itemsOfCategory(c.slug).length, 0);
    expect(total).toBe(EVERY_ITEM.length);
    expect(EVERY_ITEM.length).toBe(ALL_ITEMS.length + CATEGORY_ITEMS.length);
    expect(itemsOfCategory('no-such-category')).toEqual([]);
  });

  it('topic labels resolve for core topics and subtopics', () => {
    expect(topicLabel('l0-refs')).toBe('References & anchoring');
    expect(topicLabel('argus-recoveries')).toBe('Expense recoveries');
    expect(ALL_TOPICS.length).toBe(TOPICS.length + CATEGORY_TOPICS.length);
  });

  it('category stats count built, due, seen and mastery for that category only', () => {
    const argus = categoryBySlug('argus') as Category;
    const [a, b] = itemsOfCategory('argus');
    const core = ALL_ITEMS[0];
    const cards: Cards = { [a.id]: seen(0.8, NOW - DAY), [core.id]: seen(1, NOW - DAY) };
    const stats = categoryStats(argus, cards, NOW);
    expect(stats.built).toBe(itemsOfCategory('argus').length);
    expect(stats.target).toBe(70);
    expect(stats.due).toBe(1);
    expect(stats.seen).toBe(1);
    expect(stats.mastery).toBeCloseTo(0.8 / stats.built);
    expect(cards[b.id]).toBeUndefined();

    const coreStats = categoryStats(categoryBySlug(CORE_CATEGORY) as Category, cards, NOW);
    expect(coreStats.target).toBe(ALL_ITEMS.length);
    expect(coreStats.due).toBe(1);
  });

  it('each category has its own review queue; mixed review draws from all of them', () => {
    const picks = others.slice(0, 4).map((c) => itemsOfCategory(c.slug)[0]);
    const cards: Cards = Object.fromEntries(picks.map((i, n) => [i.id, seen(0.5, NOW - (n + 1) * DAY)]));
    cards[ALL_ITEMS[5].id] = seen(0.5, NOW - DAY);

    for (const p of picks) expect(dueItems(itemsOfCategory(p.category), cards, NOW).map((i) => i.id)).toEqual([p.id]);
    expect(dueEverywhere(cards, NOW).length).toBe(5);
    expect(categoriesWithDue(cards, NOW)).toBe(5);

    const mixed = buildSession(EVERY_ITEM, cards, { minutes: 45, mode: 'due', noGrids: false, manualLevel: 1, now: NOW, topics: ALL_TOPICS }, mulberry32(3));
    expect(mixed.map((i) => i.id).sort()).toEqual([...picks.map((p) => p.id), ALL_ITEMS[5].id].sort());
    // interleaved: no two neighbours from the same category when it can be avoided
    for (let i = 1; i < mixed.length; i++) expect(mixed[i].category === mixed[i - 1].category).toBe(false);
  });

  it('a category session serves that category only, lowest level first, without the core course’s level gate', () => {
    const entitlement = itemsOfCategory('entitlements');
    const fresh = newItems(entitlement, {}, 0, ALL_TOPICS, () => true);
    expect(fresh.length).toBe(entitlement.length);
    expect(fresh[0].level).toBe(Math.min(...entitlement.map((i) => i.level)));
    const session = buildSession(entitlement, {}, { minutes: 20, mode: 'mixed', noGrids: false, manualLevel: 0, now: NOW, topics: ALL_TOPICS, unlocked: () => true }, mulberry32(1));
    expect(session.length).toBeGreaterThan(0);
    expect(session.every((i) => i.category === 'entitlements')).toBe(true);
  });

  it('the core course’s sessions are unchanged: same picks with or without the new optional arguments', () => {
    const opts = { minutes: 20, mode: 'mixed' as const, noGrids: false, manualLevel: 1, now: NOW };
    const before = buildSession(ALL_ITEMS, {}, opts, mulberry32(7)).map((i) => i.id);
    const after = buildSession(ALL_ITEMS, {}, { ...opts, topics: ALL_TOPICS }, mulberry32(7)).map((i) => i.id);
    expect(after).toEqual(before);
    expect(newItems(ALL_ITEMS, {}, 0).every((i) => i.level === 0)).toBe(true);
  });

  it('phone-friendly sessions leave out plan questions', () => {
    const plan = itemsOfCategory('plan-reading');
    const s = buildSession(plan, {}, { minutes: 45, mode: 'mixed', noGrids: true, manualLevel: 0, now: NOW, topics: ALL_TOPICS, unlocked: () => true }, mulberry32(2));
    expect(s.some((i) => i.type === 'plan')).toBe(false);
  });

  it('category-status reports every category, built and target', () => {
    const rows = statusRows();
    expect(rows.map((r) => r.slug)).toEqual(CATEGORIES.map((c) => c.slug));
    for (const r of rows) {
      expect(r.built).toBe(itemsOfCategory(r.slug).length);
      expect(r.target).toBeGreaterThanOrEqual(r.built);
    }
    expect(rows[0].built).toBe(rows[0].target);
    expect(evalFormula('=1+1')).toBe(2);
  });
});
