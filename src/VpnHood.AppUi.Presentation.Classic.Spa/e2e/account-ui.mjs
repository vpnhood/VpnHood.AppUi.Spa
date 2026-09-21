// account-ui.mjs — the access-code keyring, driven THROUGH THE UI with Playwright against the real
// Windows CONNECT debug app and the real dev portal (whmcs-dev). Nothing is mocked: every click
// goes to the live app, every account call reaches the live portal.
//
// The flows (access-code-keyring-plan.md):
//   1  signed out, typing a code makes this device premium and says nothing to any account
//   2  signed out, Remove is offered and takes the code off this device
//   3  signing in with email + password through the app's own dialog
//   4  a code typed WHILE SIGNED IN is uploaded — the portal's account holds it
//   5  signed in, Remove is NOT offered (§7) and Change code is
//   6  signing out takes the account's code with it
//   7  signing in again brings the code back down, with nothing to re-enter
//   8  a code typed while signed OUT is uploaded by the sign-in that follows
//   9  the account page refreshes from the portal when it opens
//
// Assertions are about STATE, never about a tunnel: connecting needs WinDivert and admin, so the
// connect attempt each code entry makes is expected to fail here and is dismissed. That a refused
// code is KEPT is itself the rule (§8) — flow 1 checks it.
//
// Prereqs
//   · the CONNECT Windows debug app is running (serves the app API on VITE_API_BASE_URL)
//   · `npm run dev` serves the SPA
//   · the private .user repo sits beside this one (dev portal password)
// Run: node e2e/account-ui.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const en = JSON.parse(readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));

const envApi = ['.env.development.local', '.env.development']
  .map(f => path.join(root, f))
  .filter(existsSync)
  .map(f => readFileSync(f, 'utf8').match(/^VITE_API_BASE_URL=(.+)$/m)?.[1]?.trim())
  .find(Boolean);
const APP = process.env.VH_E2E_APP ?? envApi;
const SPA = process.env.VH_E2E_SPA ?? 'http://localhost:8080';
if (!APP) { console.error('!! no API base: set VH_E2E_APP or VITE_API_BASE_URL'); process.exit(1); }

const secretsPath = path.join(root, '..', '.user/account-dev.vpnhood.com/secrets.json');
if (!existsSync(secretsPath)) {
  console.error(`!! dev secrets not found: ${secretsPath}\n   this suite needs the private .user repo beside this one.`);
  process.exit(1);
}
const secrets = JSON.parse(readFileSync(secretsPath, 'utf8'));
const EMAIL = process.env.VH_E2E_EMAIL ?? 'test-buyer@vpnhood.com';
const OUT = path.join(root, 'test-results', 'account-ui');
mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ harness --
let failed = 0;
let flow = '';
const ok = m => console.log(`   PASS ${m}`);
const bad = m => { console.error(`!! FAIL [${flow}] ${m}`); failed = 1; };
const check = (cond, pass, fail) => { if (cond) ok(pass); else bad(fail ?? pass); };
const step = m => { flow = m; console.log(`\n== ${m}`); };
const mask = c => (typeof c === 'string' && c.length > 4 ? `…${c.slice(-4)}` : String(c));
const last4 = c => String(c ?? '').replace(/\D/g, '').slice(-4);

const api = async (method, p, body) => {
  const res = await fetch(APP + p, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};

/**
 * The app's own view of this device — read from /api/app/state, which is exactly the object the SPA
 * renders from (ClientProfileBaseInfo: hasAccessCode, isPremium, accessCodeRefusal). The profile
 * infos on /api/app/config are the RICHER shape and carry no hasAccessCode, so reading them here
 * would silently compare against undefined.
 */
const appState = async () => {
  const state = (await api('GET', '/api/app/state')).json;
  const cfg = (await api('GET', '/api/app/config')).json;
  const profileId = state.clientProfile?.clientProfileId
    ?? cfg.userSettings.clientProfileId ?? cfg.clientProfileInfos[0].clientProfileId;
  const account = (await api('GET', '/api/account')).json;
  return { cfg, profileId, profile: state.clientProfile, account };
};

// A well-formed access code: version 1 + a checksum digit over 18 random digits (AccessCodeUtils).
// Well-formed is ALL the portal asks for — validity is the access server's verdict at use time (§5).
function buildAccessCode(seed) {
  const random = String(seed).padStart(18, '0').slice(-18);
  let sum = [...random].reduce((n, c) => n + c.charCodeAt(0), 0);
  while (sum >= 10) sum = [...String(sum)].reduce((n, c) => n + Number(c), 0);
  return `1${sum}${random}`;
}

// ------------------------------------------------------------ page helpers --
const goHome = page => page.goto(SPA + '/', { waitUntil: 'networkidle' });

/**
 * Overlays are ROUTE state (ComponentRouteController), so a URL would open them — but a `goto` is a
 * real DOCUMENT navigation, and closing the overlay then goes BACK to a full page LOAD, which wipes
 * every component's state (a dialog opened from inside the drawer simply vanishes). So they are
 * opened by clicking, exactly as a person does, and only the page itself is navigated to.
 */
async function openDrawer(page) {
  if (new URL(page.url()).pathname !== '/') await goHome(page);
  await page.locator('.v-app-bar-nav-icon').first().click({ timeout: 20000 });
  await page.waitForTimeout(1200);   // the drawer animates in; its scrim covers the rows until then
}

async function openCodeSheet(page) {
  await page.goto(SPA + '/purchase-subscription', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: en.I_HAVE_A_PREMIUM_CODE, exact: true }).click({ timeout: 20000 });
  await page.waitForTimeout(1200);
}

/** Click a row of the navigation drawer by its exact label. */
async function clickDrawerItem(page, label) {
  const item = page.locator('.v-list-item').filter({
    has: page.getByText(label, { exact: true })
  }).first();
  await item.waitFor({ timeout: 15000 });
  await item.click({ timeout: 20000 });
}

/**
 * The account page, with any leftover error dialog cleared first. lastError survives navigation and
 * the app re-raises its dialog on every page, so without this the scrim silently eats the click on
 * whatever this flow is actually testing.
 */
async function goAccount(page) {
  await api('POST', '/api/app/clear-last-error').catch(() => {});
  await page.goto(SPA + '/user/account', { waitUntil: 'networkidle' });
  await dismissDialogs(page);
  await page.waitForTimeout(800);
}

/** Type a code in the sheet and activate it. The connect attempt that follows is expected to fail
 *  here (no WinDivert/admin), so its error dialog is dismissed rather than asserted on. */
async function typeCode(page, code) {
  // A previous connect attempt leaves lastError set, and the app re-raises its dialog on every
  // page it renders — its scrim then swallows the click on Activate. Clear the error itself
  // rather than chasing the overlay.
  await api('POST', '/api/app/clear-last-error').catch(() => {});
  await goHome(page);
  await dismissDialogs(page);          // BEFORE opening the sheet: Escape would close the sheet too
  await openCodeSheet(page);
  const field = page.getByPlaceholder(en.ENTER_YOUR_CODE);
  await field.waitFor({ timeout: 20000 });
  await field.fill(code);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: en.ACTIVATE, exact: true }).click({ timeout: 20000 });
  // the connect attempt runs behind a pending dialog; wait for it to settle before clearing up
  await page.waitForTimeout(2500);
  await api('POST', '/api/app/clear-last-error').catch(() => {});
  await goHome(page);
  await dismissDialogs(page);
}

/** Close whatever modal the connect attempt left behind, without asserting on it. */
async function dismissDialogs(page) {
  for (let i = 0; i < 8; i++) {
    const close = page.getByRole('button', { name: en.CLOSE, exact: true });
    if (await close.count() && await close.first().isVisible().catch(() => false)) {
      await close.first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    const scrim = page.locator('.v-overlay__scrim');
    if (await scrim.count() && await scrim.first().isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
  await page.waitForTimeout(300);
}

async function signInThroughUi(page) {
  await api('POST', '/api/app/clear-last-error').catch(() => {});
  await openDrawer(page);
  await clickDrawerItem(page, en.SIGN_IN);
  // with an identity provider beside it the dialog opens on the chooser; password-only opens the
  // form directly (there would be nothing to choose)
  const emailStep = page.getByRole('button', { name: en.SIGN_IN_WITH_EMAIL, exact: true });
  await page.waitForTimeout(800);
  if (await emailStep.count()) await emailStep.click();
  await page.getByLabel(en.EMAIL, { exact: true }).fill(EMAIL);
  await page.getByLabel(en.PASSWORD, { exact: true }).fill(secrets.testClientPassword);
  await page.getByRole('button', { name: en.SIGN_IN, exact: true }).last().click();
  // the dialog closes itself on success; the account then loads
  await page.waitForFunction(() => !document.body.innerText.includes('__never__'), null, { timeout: 1000 })
    .catch(() => {});
  for (let i = 0; i < 30; i++) {
    if ((await api('GET', '/api/account')).json) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

async function signOutThroughUi(page) {
  // Sign out lives on the account page (the subscription card) or in the drawer, depending on the
  // build; whichever exists, it is a UI act followed by the same confirmation.
  await goAccount(page);
  const onPage = page.getByRole('button', { name: en.SIGN_OUT, exact: true });
  if (await onPage.count()) {
    await onPage.first().click();
  } else {
    await openDrawer(page);
    await clickDrawerItem(page, en.SIGN_OUT);
  }
  await page.getByRole('button', { name: en.YES, exact: true }).click({ timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 20; i++) {
    if (!(await api('GET', '/api/account')).json) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});

// ------------------------------------------------------------------- run ----
let browser = null;
let restore = null;

try {
  const boot = (await api('GET', '/api/app/config')).json;
  if (!boot?.features?.isAccountSupported) { bad(`app at ${APP} has no account support`); process.exit(1); }
  restore = { settings: boot.userSettings };
  const codeSupported = boot?.features?.premium?.allowImportAccessCode === true;
  console.log(`   app ${APP} · SPA ${SPA} · allowImportAccessCode=${codeSupported}`);

  // a clean slate: no account, no code, whatever the last run left behind
  await api('POST', '/api/account/sign-out').catch(() => {});
  const start = await appState();
  await api('PATCH', `/api/client-profiles/${start.profileId}`, { accessCode: { value: null } });

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  page.on('pageerror', e => bad(`pageerror: ${e.message}`));

  const codeA = buildAccessCode(110000000000000001n);
  const codeB = buildAccessCode(220000000000000002n);

  // -- 1 ---------------------------------------------------------------------
  step('signed out: typing a code makes THIS DEVICE premium and tells no account');
  await goHome(page);
  await typeCode(page, codeA);
  let st = await appState();
  check(st.profile.hasAccessCode === true, 'the code is on the profile after typing it');
  check(st.profile.isPremium === true, 'the device claims premium — a failed connect never takes it back (§8)');
  check(st.account === null, 'no account was touched: a signed-out code is the device\'s own (§6)');
  await shot(page, '1-signed-out-premium');

  // -- 2 ---------------------------------------------------------------------
  step('signed out: Remove is offered, and it clears this device');
  await goAccount(page);
  const removeBtn = page.getByRole('button', { name: en.REMOVE_CODE, exact: true });
  check(await removeBtn.count() === 1, 'the account page offers Remove while signed out (§7)');
  await shot(page, '2-signed-out-account');
  await removeBtn.first().click();
  await page.getByRole('button', { name: en.YES, exact: true }).click({ timeout: 15000 });
  await page.waitForTimeout(2000);
  st = await appState();
  check(st.profile.hasAccessCode === false, 'Remove took the code off the device');
  check(st.profile.isPremium === false, '…and premium went with it — the person chose that themselves');

  // -- 3 + 8 -----------------------------------------------------------------
  step('a code typed while signed OUT is uploaded by the sign-in that follows (§6)');
  await typeCode(page, codeB);
  st = await appState();
  check(st.profile.hasAccessCode === true, 'the code is on the device before any sign-in');

  check(await signInThroughUi(page), 'signed in with email + password through the app\'s own dialog');
  await shot(page, '3-signed-in');
  await page.waitForTimeout(2000);
  st = await appState();
  check(st.account !== null, 'the account is loaded after sign-in');
  check(last4(st.account?.accessCodeInfo?.accessCode) === last4(codeB),
    'the code typed while signed out reached the account',
    `account serves ${mask(st.account?.accessCodeInfo?.accessCode)}, expected …${last4(codeB)}`);

  // -- 5 ---------------------------------------------------------------------
  step('signed in: Remove is gone, Change code is offered where the build takes codes (§7, §8)');
  await goAccount(page);
  await page.waitForTimeout(1500);
  check(await page.getByRole('button', { name: en.REMOVE_CODE, exact: true }).count() === 0,
    'no Remove while signed in — the ranking replaces a dead code by itself');
  const changeCount = await page.getByRole('button', { name: en.CHANGE_CODE, exact: true }).count();
  check(changeCount === (codeSupported ? 1 : 0),
    `Change code matches the build's capability (allowImportAccessCode=${codeSupported})`,
    `Change code count ${changeCount} with allowImportAccessCode=${codeSupported}`);
  await shot(page, '5-signed-in-account');

  // -- 4 ---------------------------------------------------------------------
  step('signed in: typing a code uploads it to the account (§6, §7)');
  await typeCode(page, codeA);
  await page.waitForTimeout(2500);
  st = await appState();
  check(st.profile.hasAccessCode === true, 'the new code is on the device at once');
  check(last4(st.account?.accessCodeInfo?.accessCode) === last4(codeA),
    'the account slot now holds the newly typed code — one slot, replaced by the upload (§5)',
    `account serves ${mask(st.account?.accessCodeInfo?.accessCode)}, expected …${last4(codeA)}`);

  // -- 6 ---------------------------------------------------------------------
  step('signing out takes the account\'s code with it (§6)');
  check(await signOutThroughUi(page), 'signed out through the app');
  await page.waitForTimeout(1500);
  st = await appState();
  check(st.account === null, 'no account on this device any more');
  check(st.profile.hasAccessCode === false,
    'the account\'s code left with the account — it must not follow the next person who signs in');
  await shot(page, '6-signed-out-again');

  // -- 7 ---------------------------------------------------------------------
  step('signing in again brings the code back down, with nothing to re-enter (§2)');
  check(await signInThroughUi(page), 'signed in again');
  await page.waitForTimeout(2500);
  st = await appState();
  check(st.profile.hasAccessCode === true, 'the account handed the code straight back');
  check(last4(st.account?.accessCodeInfo?.accessCode) === last4(codeA),
    '…and it is the same code the account ranks',
    `account serves ${mask(st.account?.accessCodeInfo?.accessCode)}, expected …${last4(codeA)}`);
  check(st.profile.isPremium === true, 'the device is premium again without anyone typing anything');
  await shot(page, '7-restored');

  // -- 8 ---------------------------------------------------------------------
  // Reading the code is a wider permission than typing one (§8): it is how a buyer carries premium
  // to their other devices, so the App Store build shows it too. It stays covered until asked for.
  step('the held code is masked until the eye is pressed (§8)');
  await goAccount(page);
  await page.waitForTimeout(1500);
  const codeRow = page.locator('#premiumCodeInfoList > li').first();
  await codeRow.waitFor({ timeout: 15000 });
  const formattedA = codeA.match(/.{1,4}/g).join('-');
  const rowText = async () => (await codeRow.innerText()).replace(/\s+/g, '');

  check((await rowText()).includes('••••-••••'), 'the code is covered when the page opens');
  check(!(await rowText()).includes(formattedA), '…and the real digits are nowhere on screen');

  const eye = page.getByLabel(en.SHOW_CODE, { exact: true });
  check(await eye.count() === 1, 'an eye button is offered to uncover it');
  await eye.first().click();
  await page.waitForTimeout(1200);
  check((await rowText()).includes(formattedA),
    'pressing the eye shows the code this device holds',
    `the row reads ${await rowText()}, expected to contain ${mask(codeA)}`);
  await shot(page, '8-code-revealed');

  await page.getByLabel(en.HIDE_CODE, { exact: true }).first().click();
  await page.waitForTimeout(800);
  check(!(await rowText()).includes(formattedA), 'pressing it again covers the code back up');

  // -- 9 ---------------------------------------------------------------------
  step('the account page is what refreshes the account (§7 — nothing polls)');
  let refreshed = false;
  page.on('response', r => { if (r.url().includes('/api/account/refresh')) refreshed = true; });
  await goAccount(page);
  await page.waitForTimeout(2500);
  check(refreshed, 'opening the account page calls the portal — the app never polls on its own');
}
finally {
  if (browser) await browser.close();
  if (restore) {
    const end = await appState().catch(() => null);
    if (end) await api('PATCH', `/api/client-profiles/${end.profileId}`, { accessCode: { value: null } }).catch(() => {});
    await api('POST', '/api/account/sign-out').catch(() => {});
    console.log('\n   cleanup: code cleared, signed out');
    console.log('   note: the dev account\'s upload slot still holds the last code this run typed —');
    console.log('         the app has no door to empty it (§7), and the next run replaces it.');
  }
}

console.log(failed ? '\nFAILED' : '\nALL OK');
process.exit(failed);
