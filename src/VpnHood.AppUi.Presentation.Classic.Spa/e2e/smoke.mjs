#!/usr/bin/env node
/**
 * Smoke-test every SPA page in a real browser against the running dev stack.
 *
 * What it does:
 *  - Derives the route list from typed-router.d.ts at run time, so a newly added page is
 *    covered automatically and the list can never go stale.
 *  - Visits every route in headless Chromium and fails on console errors, Vue warnings
 *    (e.g. a component vite-plugin-vuetify's autoImport failed to resolve), page errors,
 *    and failed requests.
 *  - Round-trips the language to Persian through the real UI — this exercises the lazy
 *    locale chunk and RTL — and always restores the previous setting via the API, even
 *    when the run fails.
 *  - Writes a full-page screenshot per route to test-results/e2e/ (gitignored).
 *
 * Prerequisites (fails loudly if missing):
 *  - The dev server:            npm run dev            (http://localhost:8080)
 *  - The Windows client app,    so the API in .env.development.local answers.
 *  - Chromium once per machine: npx playwright install chromium-headless-shell
 *
 * Usage:
 *  npm run test:e2e             all routes + language round-trip
 *  npm run test:e2e -- --no-lang    skip the language round-trip (no settings writes at all)
 */
import { promises as fs } from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const spaBase = 'http://localhost:8080';
const shotsDir = path.join(projectRoot, 'test-results', 'e2e');
const skipLang = process.argv.includes('--no-lang');

// Findings that are pre-existing app behavior, not regressions. Keep this list short and
// dated; each entry should disappear when the underlying issue is fixed.
const knownIssues = [
  // 2026-07: visiting the page directly has no profile context; it errors by design today.
  { route: '/promote-premium', pattern: /clientProfileId.*must be defined/ },
];

async function readRoutes() {
  const dts = await fs.readFile(path.join(projectRoot, 'typed-router.d.ts'), 'utf8');
  const routes = [...new Set([...dts.matchAll(/'(\/[a-z0-9/-]*)'/g)].map(m => m[1]))].sort();
  if (routes.length === 0) throw new Error('No routes found in typed-router.d.ts — run the dev server or a build once to regenerate it.');
  return routes;
}

// The SPA proxies nothing; the API origin comes from the same env files Vite reads.
async function readApiBase() {
  for (const file of ['.env.development.local', '.env.development']) {
    const content = await fs.readFile(path.join(projectRoot, file), 'utf8').catch(() => null);
    const match = content?.match(/^VITE_API_BASE_URL=(.+)$/m);
    if (match?.[1].trim()) return match[1].trim();
  }
  throw new Error('VITE_API_BASE_URL is not set in .env.development(.local) — the test needs the client API origin.');
}

// node:http instead of fetch: Node 24's undici intermittently hits a parser assertion against
// these local servers, which crashes the process instead of failing the probe.
function request(method, urlToCall, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(urlToCall, {
      method,
      timeout: 5000,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out: ${method} ${urlToCall}`)));
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

async function assertUp(name, urlToCheck, hint) {
  const ok = await request('GET', urlToCheck).then(r => r.status >= 200 && r.status < 400).catch(() => false);
  if (!ok) throw new Error(`${name} is not answering at ${urlToCheck}. ${hint}`);
}

const apiBase = await readApiBase();
await assertUp('Dev server', spaBase, "Start it with 'npm run dev'.");
await assertUp('Client API', `${apiBase}/api/app/config`, 'Start the VpnHood client app this env file points to.');
await fs.mkdir(shotsDir, { recursive: true });

const routes = await readRoutes();
const browser = await chromium.launch().catch((err) => {
  throw new Error(`Could not launch Chromium — run 'npx playwright install chromium-headless-shell' once.\n${err.message.split('\n')[0]}`);
});
const page = await browser.newPage({ viewport: { width: 420, height: 850 } });

let currentRoute = 'startup';
const findings = [];
const startups = [];
const report = (type, text) => {
  const known = knownIssues.some(k => k.route === currentRoute && k.pattern.test(text));
  findings.push({ route: currentRoute, type, text: text.slice(0, 250), known });
  console.log(`${known ? '(known) ' : ''}[${currentRoute}] ${type}: ${text.slice(0, 250)}`);
};

page.on('console', (msg) => {
  const text = msg.text();
  if (/^Startup\(ms\)/.test(text)) return startups.push(`[${currentRoute}] ${text}`);
  if (msg.type() === 'warning' || msg.type() === 'error' || /\[Vue warn\]|\[intlify\]|Failed to resolve/i.test(text))
    report(msg.type().toUpperCase(), text);
});
page.on('pageerror', (err) => report('PAGEERROR', String(err)));
page.on('requestfailed', (req) => report('REQFAIL', `${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));

async function visit(route) {
  currentRoute = route;
  try {
    await page.goto(spaBase + route, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(shotsDir, (route.replaceAll('/', '_').replace(/^_/, '') || 'home') + '.png'), fullPage: true });
  } catch (err) {
    report('NAVFAIL', String(err));
  }
}

for (const route of routes) await visit(route);

// Language round-trip: the one mutation this test performs, always undone in finally.
if (!skipLang) {
  const config = JSON.parse((await request('GET', `${apiBase}/api/app/config`)).body);
  const originalCulture = config.userSettings.cultureCode ?? null;
  try {
    currentRoute = 'lang-switch-fa';
    await page.goto(`${spaBase}/settings/language`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(600);
    await page.locator('.v-list-item', { hasText: 'فارسی' }).first().click();
    await page.waitForLoadState('load', { timeout: 30000 }); // the click triggers router.go(0)
    // Wait on the condition, not a fixed delay: the app mounts only after its async startup
    // (configure round-trip + locale chunk), whose duration varies.
    const applied = await page.waitForFunction(
      () => document.body.classList.contains('fa') && !!document.querySelector('.v-locale--is-rtl'),
      undefined, { timeout: 20000 }).then(() => true).catch(() => false);
    await page.screenshot({ path: path.join(shotsDir, 'language-fa.png'), fullPage: true });
    if (!applied)
      report('LANGFAIL', `Persian did not apply within 20s: ${JSON.stringify(await page.evaluate(() => [...document.body.classList]))}`);
    else
      console.log('[lang] Persian applied: lazy locale chunk + RTL OK');
  } finally {
    currentRoute = 'lang-restore';
    config.userSettings.cultureCode = originalCulture;
    const put = await request('PUT', `${apiBase}/api/app/user-settings`, config.userSettings);
    if (put.status !== 200 && put.status !== 204)
      report('RESTOREFAIL', `Could not restore cultureCode=${JSON.stringify(originalCulture)}: HTTP ${put.status}`);
    else console.log(`[lang] restored cultureCode=${JSON.stringify(originalCulture)}`);
  }
}

await browser.close();

const unknown = findings.filter(f => !f.known);
// Printed only when main.ts carries startup instrumentation (none by default).
if (startups.length > 0) console.log('\n' + startups[0]);
console.log(`\n${routes.length} routes visited, ${findings.length} finding(s), ${unknown.length} unexpected. Screenshots: test-results/e2e/`);
process.exit(unknown.length === 0 ? 0 : 1);
