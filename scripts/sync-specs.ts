/**
 * `npm run sync-specs`: re-renders the generated blocks (subtopic table,
 * worked examples, type mix, chunk plan) of every BUILD_SPEC.md from the
 * registry and each category's spec-data.ts. Run it after editing either.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIES, CORE_CATEGORY } from '../src/content/categories/registry';
import { SPEC_DATA, syncSpec } from '../src/content/categories/specs';

export default function main(): number {
  let changed = 0;
  for (const cat of CATEGORIES) {
    if (cat.slug === CORE_CATEGORY) continue;
    const path = resolve('src/content/categories', cat.slug, 'BUILD_SPEC.md');
    const data = SPEC_DATA[cat.slug];
    if (!existsSync(path) || !data) {
      console.log(`skip    ${cat.slug} (no BUILD_SPEC.md or spec-data.ts yet)`);
      continue;
    }
    const before = readFileSync(path, 'utf8');
    const after = syncSpec(before, cat, data);
    if (after !== before) {
      writeFileSync(path, after);
      changed++;
      console.log(`updated ${cat.slug}`);
    } else {
      console.log(`ok      ${cat.slug}`);
    }
  }
  console.log(`${changed} spec${changed === 1 ? '' : 's'} updated.`);
  return 0;
}
