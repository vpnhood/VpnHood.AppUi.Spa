// account-dev.mjs — the access-code keyring rules, driven through the REAL Windows CONNECT debug
// app signed into the REAL dev portal (whmcs-dev). Only the access-server refusal is mocked (route
// interception patches /api/app/state), because a live refusal cannot be provoked on demand.
//
// What it pins (keyring plan §5–§8):
//   · the PROFILE is the only door for a typed code; the account hears about it afterwards
//   · the portal takes any well-formed code on trust — there is no "not found" answer
//   · clearing the profile while signed in never empties the account's slot
//   · a refusal offers Restore Premium and Change code — never Remove
//
// Prereqs: the app is running and `npm run dev` serves the SPA.
//   VH_E2E_APP   app + API origin      (default: VITE_API_BASE_URL from .env.development.local/.env.development)
//   VH_E2E_SPA   SPA origin            (default: http://localhost:8080)
//   VH_E2E_ACCESS_CODE  a real code; enables the premium-session phase (null-capture armed)
// Run: node e2e/account-dev.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const en = JSON.parse(readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));

// the SPA in the browser talks to VITE_API_BASE_URL; drive the SAME app from here, or the
// script and the browser silently test two different clients (smoke.mjs reads it the same way)
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
const OUT = path.join(root, 'test-results', 'account-dev');
mkdirSync(OUT, { recursive: true });

let failed = 0;
const ok = m => console.log(`   PASS ${m}`);
const bad = m => { console.error(`!! FAIL ${m}`); failed = 1; };
const check = (cond, pass, fail) => { if (cond) ok(pass); else bad(fail); };
const mask = c => (typeof c === 'string' && c.length > 4 ? `…${c.slice(-4)}` : String(c)); // never log a whole code
const last4 = c => String(c ?? '').replace(/\D/g, '').slice(-4);

const api = async (method, p, body) => {
  const res = await fetch(APP + p, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
};

const typeCode = (profileId, value) =>
  api('PATCH', `/api/client-profiles/${profileId}`, { accessCode: { value } });

let browser = null;
let restore = null; // what the run must undo, whatever happens

try {
  // ---- preconditions: the real stack is up --------------------------------
  const cfg = (await api('GET', '/api/app/config')).json;
  if (!cfg?.features?.isAccountSupported) { bad(`app at ${APP} has no account support`); process.exit(1); }
  ok(`app is up with account support (${APP})`);
  restore = { settings: cfg.userSettings, profileId: cfg.userSettings.clientProfileId ?? cfg.clientProfileInfos[0].clientProfileId };

  // the account API deliberately has NO set-access-code: a code is typed into a profile, and the
  // account hears about it afterwards (§7). A stale SPA calling the old route must get a 404.
  const goneRoute = await api('PUT', '/api/account/access-code', { accessCode: null });
  check(goneRoute.status === 404,
    'the account has no set-access-code route — the profile is the only door',
    `PUT /api/account/access-code answered ${goneRoute.status}, expected 404`);

  // ---- sign in through the app into the REAL dev portal -------------------
  const signIn = await api('POST', '/api/account/sign-in',
    { providerId: 'password', userName: 'test-buyer@vpnhood.com', password: secrets.testClientPassword });
  check(signIn.json?.state === 'SignedIn',
    'signed into whmcs-dev through the app (password provider)',
    `sign-in failed: ${signIn.status} ${JSON.stringify(signIn.json?.state ?? null)}`);

  const account = (await api('GET', '/api/account')).json;
  const hasSubscription = account?.subscription != null;
  ok(`test account ${hasSubscription ? 'HAS' : 'has no'} store subscription`);

  // ---- a well-formed code the portal has never seen -----------------------
  // The backend takes it on trust: validity is settled at use time by the access server, never at
  // save time by the portal (§5). There is no "not found" answer and no result status to inspect.
  const unknown = '1e2e0000000000000000';
  const typed = await typeCode(restore.profileId, unknown);
  check(typed.status === 200,
    'an unknown but well-formed code is accepted — no not-found answer exists',
    `typing an unknown code answered ${typed.status}`);

  if (!hasSubscription) {
    const served = (await api('GET', '/api/account')).json;
    check(last4(served?.accessCodeInfo?.accessCode) === last4(unknown),
      'the typed code reached the account and is what it now ranks',
      `account serves ${mask(served?.accessCodeInfo?.accessCode)}, expected ${last4(unknown)}`);
  }

  // clearing the profile says NOTHING to the account (§7: no Remove while signed in), so the
  // ranking hands the code straight back on the next refresh
  await typeCode(restore.profileId, null);
  await api('POST', '/api/account/refresh');
  const back = (await api('GET', '/api/app/config')).json;
  const backProfile = back?.clientProfileInfos?.find(p => p.clientProfileId === restore.profileId);
  check(backProfile?.accessCode != null,
    'clearing the profile while signed in never empties the slot — the code comes back',
    'the code did not return after a refresh: the app reached the account slot');

  // ---- a REAL code: premium session --------------------------------------
  const realCode = process.env.VH_E2E_ACCESS_CODE;
  if (realCode) {
    await api('PUT', '/api/app/user-settings', { ...restore.settings, debugData1: '/null-capture' });
    await typeCode(restore.profileId, realCode);
    ok(`typed the real code (${mask(last4(realCode))}) onto the profile, null-capture armed`);

    await api('POST', `/api/app/connect?clientProfileId=${restore.profileId}`);
    let st = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500));
      st = (await api('GET', '/api/app/state')).json;
      if (st.connectionState === 'Connected' || st.lastError) break;
    }
    check(st?.connectionState === 'Connected' && st?.sessionInfo?.isPremiumSession === true,
      'connected with the typed code — a real PREMIUM session (nothing captured)',
      `premium connect failed: ${st?.connectionState} ${st?.lastError?.message ?? ''}`);
    await api('POST', '/api/app/disconnect');
  }
  else ok('VH_E2E_ACCESS_CODE not set — real-code phase skipped');

  // ---- browser: the SPA against the live app ------------------------------
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 850 } });
  page.on('pageerror', e => bad(`pageerror: ${e.message}`));

  // the one mock: the access server refused the serving code. Everything else is real.
  let mockRefusal = false;
  await page.route('**/api/app/state', async route => {
    const res = await route.fetch();
    const state = await res.json();
    if (mockRefusal) {
      state.clientProfile = { ...state.clientProfile, hasAccessCode: true };
      state.lastError = {
        typeName: 'SessionException',
        typeFullName: 'VpnHood.Core.Common.Exceptions.SessionException',
        message: 'Your premium access has expired.',
        data: { ErrorCode: 'AccessExpired' }
      };
    }
    await route.fulfill({ response: res, json: state });
  });

  await page.goto(SPA, { waitUntil: 'networkidle' });
  ok('SPA loads over the live app');

  mockRefusal = true;
  await page.getByRole('button', { name: en.RESTORE_PREMIUM }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, 'refusal-fork.png') });
  ok('a refusal offers Restore Premium');

  // Never Remove (§7, §8): the refused code is KEPT, and the only repair offered is a new code
  // wherever this build may take one at all.
  const removeCount = await page.getByRole('button', { name: en.REMOVE_CODE, exact: true }).count();
  check(removeCount === 0,
    '…and never Remove — a refusal must not let the app downgrade itself',
    'the retired Remove action is still offered on a refusal');

  const changeCount = await page.getByRole('button', { name: en.CHANGE_CODE, exact: true }).count();
  const codeSupported = cfg?.features?.premium?.allowImportAccessCode === true;
  check(changeCount === (codeSupported ? 1 : 0),
    `Change code is offered exactly where the build takes typed codes (allowImportAccessCode=${codeSupported})`,
    `Change code count ${changeCount} does not match allowImportAccessCode=${codeSupported}`);
}
finally {
  // always undone, on success and on failure alike
  if (browser) await browser.close();
  if (restore) {
    await typeCode(restore.profileId, null).catch(() => {});
    await api('PUT', '/api/app/user-settings', { ...restore.settings, debugData1: null }).catch(() => {});
    await api('POST', '/api/account/sign-out').catch(() => {});
    console.log('   cleanup: code cleared, debug flag restored, signed out');
    console.log('   note: the account\'s upload slot still holds the last code this run typed —');
    console.log('         the app has no door to empty it (§7), and the next run replaces it.');
  }
}

console.log(failed ? 'FAILED' : 'ALL OK');
process.exit(failed);
