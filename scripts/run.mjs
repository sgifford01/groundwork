// Runs one of the TypeScript scripts in this folder through Vite, so it can
// import the app's own modules (the same way the tests do).
//   node scripts/run.mjs category-status
import { createServer } from 'vite';

const [name, ...args] = process.argv.slice(2);
if (!name) {
  console.error('Usage: node scripts/run.mjs <script-name>');
  process.exit(1);
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
});
let code = 0;
try {
  const mod = await server.ssrLoadModule(`/scripts/${name}.ts`);
  code = (await mod.default(args)) ?? 0;
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
