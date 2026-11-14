/** `npm run category-status`: one line per category with tier, status and built vs. target counts. */
import { statusRows } from '../src/learn/category';

export default function main(): number {
  const rows = statusRows();
  const head = ['Category', 'Slug', 'Tier', 'Status', 'Built', 'Target', 'Done', 'Build with'];
  const body = rows.map((r) => [
    r.title,
    r.slug,
    r.tier,
    r.status,
    String(r.built),
    String(r.target),
    `${r.target ? Math.round((r.built / r.target) * 100) : 0}%`,
    r.model,
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => ([4, 5, 6].includes(i) ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const b of body) console.log(line(b));
  const built = rows.reduce((n, r) => n + r.built, 0);
  const target = rows.reduce((n, r) => n + r.target, 0);
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  console.log(line(['All categories', '', '', '', String(built), String(target), `${Math.round((built / target) * 100)}%`, '']));
  return 0;
}
