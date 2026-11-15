/**
 * Collects the questions of every non-core category.
 *
 * Any file named items.ts or items-<something>.ts inside
 * src/content/categories/<slug>/ is picked up automatically; it must export
 * `ITEMS` (built with categoryItems('<slug>', [...])). No list to maintain.
 *
 * On top of the schema, each question is checked against the registry here,
 * so a mistake shows up as a clear error the moment the app or tests load.
 */
import { leaseItemProblems } from '../../grading/leases';
import { planSetDef, buildPlanSet } from '../../plans/sets';
import { ItemSchema, type Item, type ItemInput } from '../schema';
import { categoryBySlug, categoryTopic, CORE_CATEGORY } from './registry';

const modules = import.meta.glob<{ ITEMS?: ItemInput[] }>('./*/items*.ts', { eager: true });

function fail(id: string, message: string): never {
  throw new Error(`Category question "${id}": ${message}`);
}

function check(item: Item, folder: string): void {
  const cat = categoryBySlug(item.category);
  if (!cat || item.category === CORE_CATEGORY) fail(item.id, `unknown category "${item.category}"`);
  if (item.category !== folder) fail(item.id, `lives in folder "${folder}" but says category "${item.category}"`);
  if (!item.id.startsWith(`${item.category}-`)) fail(item.id, `id must start with "${item.category}-"`);
  const topic = categoryTopic(item.topic);
  if (!topic || topic.category !== item.category) fail(item.id, `topic "${item.topic}" is not a subtopic of ${item.category}`);
  if (topic.level !== item.level) fail(item.id, `level ${item.level} does not match its subtopic's level ${topic.level}`);
  if (cat.needsLegalVerification && !item.noLegalClaim && !(item.verifiedAsOf && item.sourceUrl)) {
    fail(item.id, `${cat.title} needs legal verification: give verifiedAsOf and sourceUrl, or noLegalClaim: true`);
  }
  if (item.type === 'judgment' && item.options.filter((o) => o.rating === 'best').length !== 1) {
    fail(item.id, 'a judgment question needs exactly one option rated "best"');
  }
  if (item.type === 'docreview') {
    const lines = new Map(item.document.lines.map((l) => [l.id, l]));
    if (lines.size !== item.document.lines.length) fail(item.id, 'document line ids must be unique');
    const used = new Set<string>();
    for (const issue of item.issues) {
      for (const id of issue.lines) {
        const line = lines.get(id);
        if (!line) fail(item.id, `issue refers to a line "${id}" that is not in the document`);
        if (line.heading) fail(item.id, `issue line "${id}" is a heading, which cannot be flagged`);
        if (used.has(id)) fail(item.id, `line "${id}" belongs to two issues`);
        used.add(id);
      }
    }
    const cols = item.document.columns?.length;
    if (cols) {
      for (const l of item.document.lines) {
        if ((l.cells?.length ?? 0) !== cols - 1) fail(item.id, `line "${l.id}" needs ${cols - 1} cells to match the columns`);
      }
    }
  }
  if (item.type === 'leasesim') {
    const problems = leaseItemProblems(item);
    if (problems.length) fail(item.id, problems.join('; '));
  }
  if (item.type === 'plan') {
    if (!planSetDef(item.plan.set)) fail(item.id, `unknown plan set "${item.plan.set}"`);
    for (const variant of item.plan.variants) {
      const set = buildPlanSet(item.plan.set, variant); // throws on a bad parameter
      if (!set.sheets.some((s) => s.id === item.plan.sheet)) fail(item.id, `plan set has no sheet "${item.plan.sheet}"`);
    }
  }
}

export const CATEGORY_RAW_ITEMS: ItemInput[] = [];
const parsed: Item[] = [];

for (const [path, mod] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
  const folder = path.split('/')[1];
  if (!mod.ITEMS) throw new Error(`${path} must export ITEMS`);
  for (const raw of mod.ITEMS) {
    const where = (raw as { id?: string }).id ?? '(no id)';
    const result = ItemSchema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Category question "${where}" (${path}) does not match the schema: ${issues}`);
    }
    check(result.data, folder);
    CATEGORY_RAW_ITEMS.push(raw);
    parsed.push(result.data);
  }
}

/** Every question outside the core Excel & Pro Forma course. */
export const CATEGORY_ITEMS: Item[] = parsed;
