#!/usr/bin/env node
/**
 * Generate store screenshots for the SPA — every store from one engine, no VpnHood client required.
 *
 * By default it serves the production build from dist/ and answers every /api/** call from
 * e2e/store/fixture.json plus the per-platform and per-shot patches in e2e/store/project.mjs.
 * Nothing connects, no VPN runs, no secrets are needed, and the same input always produces the same
 * PNG — which is what makes this runnable on a CI box.
 *
 * The fixture keeps the SHAPE of a real /api/app/config response so the mock cannot drift from the
 * contract, with every identifying value replaced by synthetic demo data. Each PLATFORM overlays a
 * capability patch (mirroring its IDevice/IDeviceUiProvider flags) so the SPA renders exactly what
 * that OS build shows.
 *
 * A fork customises e2e/store/project.mjs (platforms, devices, shots, patches) and fixture.json.
 * This file is the engine and should not need editing.
 *
 * Two phases, either runnable alone:
 *   capture  drives the SPA and writes supersampled raw PNGs to raw/<platform>/
 *   frame    produces the store-ready files in final/<platform>/ — a device mockup (iOS), the bare
 *            capture at store size (Google Play), or a desktop window composite (Microsoft Store).
 *            raw/ is an intermediate, not a deliverable.
 *
 * Usage:
 *   npm run store:screenshots                              build + all platforms (no install)
 *   node e2e/store-screenshots.mjs                         all platforms, mocked — the normal path
 *   node e2e/store-screenshots.mjs --install               also copy each set into its per-locale installDirs
 *   node e2e/store-screenshots.mjs --install --install-root ../Vpnhood.App.Client
 *   node e2e/store-screenshots.mjs --platform android-phone,android-tv
 *   node e2e/store-screenshots.mjs --platform ios --only 1 --device ipad-13
 *   node e2e/store-screenshots.mjs --frame-only            re-frame without re-capturing
 *   node e2e/store-screenshots.mjs --locale fa             one locale (default: all in LOCALES)
 *   node e2e/store-screenshots.mjs --jobs 8                captures in flight at once (default 4)
 *   node e2e/store-screenshots.mjs --api http://127.0.0.1:4700   against a live Release client
 *   node e2e/store-screenshots.mjs --project ../Vpnhood.App.Connect/store/project.mjs
 *
 * Chromium once per machine: npx playwright install --with-deps chromium
 */
import { promises as fs, createReadStream } from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const outDir = path.join(projectRoot, 'test-results', 'store-screenshots');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

// The per-app configuration. The built-in ./store/project.mjs describes VpnHood! CLIENT (and
// doubles as this repo's e2e config); --project loads another app's config instead — a store
// repo's own store/project.mjs, resolved against the working directory. That app's fixture.json
// is expected next to its project file.
const projectFile = path.resolve(argValue('--project', null) ?? path.join(__dirname, 'store', 'project.mjs'));
const { ANGLE, INSTALL_ROOT, LOCALES, PLATFORMS, ROUTES, prepare } = await import(url.pathToFileURL(projectFile).href);
const fixturePath = path.join(path.dirname(projectFile), 'fixture.json');
const liveApi = argValue('--api', null)?.replace(/\/$/, '') ?? null;
const doCapture = !args.includes('--frame-only');
const doFrame = !args.includes('--capture-only');
const doInstall = args.includes('--install');
const only = argValue('--only', null)?.split(',').map(s => s.trim()).filter(Boolean) ?? null;

// The checkout every installDir resolves inside: the repo that owns the store assets. The project
// names its usual sibling checkout; a CI caller points --install-root at its own workspace.
const installRoot = path.resolve(projectRoot, argValue('--install-root', null) ?? INSTALL_ROOT ?? '.');
if (doInstall) console.log(`install root: ${installRoot}`);

// A project.mjs that predates locale support keeps the historic single-locale behaviour.
const locales = LOCALES?.length ? LOCALES : [{ tag: 'en-US', culture: 'en' }];
const localeFilter = argValue('--locale', null)?.split(',').map(s => s.trim()).filter(Boolean) ?? null;
for (const tag of localeFilter ?? [])
  if (!locales.some(l => l.tag === tag))
    throw new Error(`Unknown --locale "${tag}". Known: ${locales.map(l => l.tag).join(', ')}.`);
const selectedLocales = localeFilter ? locales.filter(l => localeFilter.includes(l.tag)) : locales;

// Captures in flight at once. Most of a capture is waiting (load, network-idle, settle), not CPU,
// so a small pool overlaps those waits; --jobs 1 restores the fully serial run.
const JOBS = Math.max(1, parseInt(argValue('--jobs', '4'), 10) || 1);

// Capture above the output scale: the app is drawn into a device narrower than the canvas, so it is
// downscaled on the way in, and shooting at the output scale leaves visibly soft text.
const CAPTURE_SUPERSAMPLE = 2;
// Chromium rasterizes a 3D-transformed subtree into a texture and resamples it, which undoes that
// sharpness again. Render the frame above size too and downsample once, deliberately.
const FRAME_SUPERSAMPLE = 2;

const platformArg = argValue('--platform', null);
const platformKeys = platformArg ? platformArg.split(',').map(s => s.trim()) : Object.keys(PLATFORMS);
for (const key of platformKeys)
  if (!PLATFORMS[key])
    throw new Error(`Unknown --platform "${key}". Known: ${Object.keys(PLATFORMS).join(', ')}.`);

// Shot numbers — and so the store filenames — follow array position in project.mjs: reordering a
// set is moving array items, never renumbering. Shots are copied per platform so a shot object
// shared between platforms still numbers independently in each.
for (const platform of Object.values(PLATFORMS))
  platform.shots = platform.shots.map((shot, i) => ({ ...shot, num: String(i + 1) }));

const deviceArg = argValue('--device', null);
const deviceFilter = deviceArg ? deviceArg.split(',').map(s => s.trim()) : null;
if (deviceFilter) {
  const known = platformKeys.flatMap(p => Object.keys(PLATFORMS[p].devices));
  for (const key of deviceFilter)
    if (!known.includes(key))
      throw new Error(`Unknown --device "${key}" for the selected platform(s). Known: ${known.join(', ')}.`);
}

const platformDevices = (platform) =>
  Object.entries(platform.devices).filter(([key]) => !deviceFilter || deviceFilter.includes(key)).map(([, d]) => d);
const selected = (platform) => only ? platform.shots.filter(s => only.includes(s.num)) : platform.shots;
const fileName = (device, shot, locale) => `${device.prefix}${shot.num}_${locale.tag}.png`;
// Installed files drop the locale suffix — the store's per-locale directory carries it, and plain
// 1.png… is the layout supply/deliver (and the catalogs that scrape fastlane trees) read.
const installName = (device, shot) => `${device.prefix}${shot.num}.png`;
const finalSize = (device) => device.frame === 'desktop'
  ? { width: device.canvas.width, height: device.canvas.height }
  : { width: device.cssWidth * device.scale, height: device.cssHeight * device.scale };

/** Patches name only the fields that matter, so they merge into the fixture rather than replace it. */
function deepMerge(base, patch) {
  if (Array.isArray(patch) || patch === null || typeof patch !== 'object') return patch;
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch))
    merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  return merged;
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

/**
 * Serves the production build. Deep links fall back to index.html the same way the client's own web
 * server does (VpnHoodAppWebServer.DefaultRoute), so /protocols/cloak-mode resolves.
 *
 * dist/ specifically, never the Vite dev server: edgeToEdge* short-circuit to null under
 * import.meta.env.DEV, and the split-CSS layer order that governs font sizing only applies to a
 * production build.
 */
async function serveSpa() {
  const server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const candidate = path.join(distDir, pathname);
    const file = await fs.stat(candidate).then(s => s.isFile() ? candidate : null).catch(() => null);
    const served = file ?? path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(served)] ?? 'application/octet-stream' });
    createReadStream(served).pipe(res);
  });
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).on('error', reject));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

/**
 * Answers /api/** from the platform-patched fixture. Anything the project has not declared is
 * reported rather than quietly 404'd, so a screen that starts calling a new endpoint surfaces as a
 * warning instead of a silently broken screenshot.
 */
async function mockApi(page, fixture, shot) {
  const state = shot.patch ? deepMerge(fixture, shot.patch) : fixture;
  const unhandled = new Set();

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const key = `${request.method()} ${new URL(request.url()).pathname}`;
    const handler = ROUTES[key];
    if (!handler) {
      unhandled.add(key);
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', json: handler(state) });
  });

  return unhandled;
}

/** The SPA reads its UI language from the boot state, so a locale is one more state patch. */
const localePatch = (locale) => ({ state: { currentUiCultureInfo: { code: locale.culture } } });

/** Layers the live client's real responses with the same per-shot patch the mock would apply. */
async function patchLiveApi(page, shot, locale) {
  const patch = deepMerge(localePatch(locale), shot.patch ?? {});
  await page.route('**/api/app/**', async (route) => {
    const response = await route.fetch();
    const body = await response.json().catch(() => null);
    if (!body) return route.fulfill({ response });
    // /api/app/state is the AppState itself; /api/app/config nests it under .state.
    const p = body.connectionState !== undefined ? patch.state : patch;
    return route.fulfill({ response, json: deepMerge(body, p ?? {}) });
  });
}

/** Runs thunks with up to `size` in flight; after the first failure no new work starts, and the
 * error is rethrown once the in-flight tasks have settled — no capture is torn down mid-shot. */
async function runPool(thunks, size) {
  const queue = [...thunks];
  let firstError = null;
  const workers = Array.from({ length: Math.max(1, Math.min(size, queue.length)) }, async () => {
    while (queue.length && !firstError) {
      try { await queue.shift()(); }
      catch (err) { firstError ??= err; }
    }
  });
  await Promise.all(workers);
  if (firstError) throw firstError;
}

async function captureDevice(browser, platform, device, origin, fixture, rawDir) {
  const unhandledAll = new Set();

  const captureShot = async (locale, shot) => {
    // A static source is device-independent: the frame pass fits and crops it to each device's
    // content box, so one PNG serves every slot.
    if (shot.source) {
      await fs.copyFile(path.resolve(projectRoot, shot.source), path.join(rawDir, fileName(device, shot, locale)));
      console.log(`reused    ${device.label.padEnd(11)} ${fileName(device, shot, locale)}  ${shot.label}  <- ${path.basename(shot.source)}`);
      return;
    }

    // A context per shot, because the API patch differs per shot and the SPA reads it at startup.
    const context = await browser.newContext({
      viewport: { width: device.cssWidth, height: device.cssHeight - device.safeTop - device.safeBottom },
      deviceScaleFactor: device.scale * CAPTURE_SUPERSAMPLE,
      isMobile: device.isMobile ?? true,
      hasTouch: device.hasTouch ?? true,
      userAgent: device.userAgent,
      reducedMotion: 'reduce', // no half-played transitions, and one less source of run-to-run drift
    });
    const page = await context.newPage();

    // A broken mock shows up as an error dialog painted over the screenshot, which is easy to ship
    // by accident. Surface it as a failure instead of leaving it to whoever eyeballs the PNG.
    const failures = [];
    const firstLine = (text) => String(text).split(/\r?\n/)[0];
    // Keep the top of the stack, not just the message: a bare "Cannot read properties of null"
    // with no location cost a real debugging round-trip (2026-08-29, the fixture's missing
    // authProviderIds). The prod bundle is minified, so the frames are chunk:line:col rather than
    // component names — still enough to bisect, and a SyntaxError shows which chunk failed to parse.
    page.on('pageerror', (err) =>
      failures.push(String(err?.stack ?? err).split(/\r?\n/).slice(0, 4).join('\n      ')));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const { url = '', lineNumber } = msg.location() ?? {};
      const at = url ? `  (${url.split('/').pop()}:${lineNumber})` : '';
      failures.push(firstLine(msg.text()) + at);
    });

    const unhandled = liveApi
      ? (await patchLiveApi(page, shot, locale), new Set())
      : await mockApi(page, deepMerge(fixture, localePatch(locale)), shot);

    await page.goto(origin + shot.route, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // The app mounts only after its async startup (configure round-trip + locale chunk), so wait on
    // the condition rather than a fixed delay.
    await page.waitForFunction(() => document.querySelector('#app')?.children.length > 0,
      { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);

    if (shot.hide?.length) {
      const selector = shot.hide.join(', ');
      // Fail rather than quietly ship the element: a Vuetify upgrade that renames these classes
      // would otherwise silently put a hidden chip back into the listing.
      const matched = await page.locator(selector).count();
      if (matched === 0)
        throw new Error(`${fileName(device, shot, locale)}: nothing matched "${selector}", so it was not hidden.`);
      await page.addStyleTag({ content: `${selector} { display: none !important; }` });
      await page.waitForTimeout(150); // the row reflows without the chip
    }

    // The SPA routes thrown errors through ErrorHandler.processError into a dialog rather than the
    // console, so a TS regression can produce a perfectly "successful" run with an error panel
    // painted over the screen. No store screenshot is ever meant to have a dialog open, so treat any
    // visible overlay as a failure — that catches app errors, review prompts and anything added later.
    const openDialog = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('.v-overlay--active, .v-dialog')]
        .find(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden');
      return visible ? visible.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    });
    if (openDialog)
      failures.push(`a dialog was open over the screen: "${openDialog}"`);

    if (failures.length) {
      // The two usual suspects, named in the error so the fix needs no log spelunking: an endpoint
      // the project never mocked (answered null), or a fixture missing a field the SPA now reads.
      const hint = unhandled.size
        ? `\n  unmocked endpoints answered null during this shot (a likely cause — mock them in ROUTES, ` +
          `or add the missing fixture field they stand in for): ${[...unhandled].join(', ')}`
        : '';
      throw new Error(
        `${fileName(device, shot, locale)}: the app errored while rendering, so the capture would show a ` +
        'dialog over the screen.\n  ' + [...new Set(failures)].slice(0, 5).join('\n  ') + hint);
    }

    await page.screenshot({ path: path.join(rawDir, fileName(device, shot, locale)) });
    console.log(`captured  ${device.label.padEnd(11)} ${fileName(device, shot, locale)}  ${shot.label}`);
    unhandled.forEach(u => unhandledAll.add(u));
    await context.close();
  };

  // Every shot owns its browser context and route mock, and the pixels do not depend on timing,
  // so a pooled run produces the same bytes as a serial one — only the log order varies.
  await runPool(
    selectedLocales.flatMap(locale => selected(platform).map(shot => () => captureShot(locale, shot))),
    JOBS);

  return unhandledAll;
}

/**
 * The mockups are drawn in CSS rather than composited from image assets: no binary to keep in the
 * repo, and the geometry stays editable per device. Everything is inlined — the page never makes a
 * request, which also means it renders identically on a CI box.
 */
function phoneFramePage(dataUri, device, shot, fontDataUri) {
  const angle = shot.angle ?? ANGLE;
  const screenH = Math.round(device.screenW * (device.cssHeight / device.cssWidth));
  const bandScale = screenH / device.cssHeight;
  const topBand = +(device.safeTop * bandScale).toFixed(2);
  const bottomBand = +(device.safeBottom * bandScale).toFixed(2);
  const islandCss = device.island ? `
  .island {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: ${device.island.width}px; height: ${device.island.height}px;
    border-radius: ${device.island.height / 2}px; background: #000;
  }` : '';
  // An Android camera cutout is a centred punch hole, not an island.
  const punchCss = device.punchHole ? `
  .punch {
    position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
    width: ${device.punchHole.size}px; height: ${device.punchHole.size}px;
    border-radius: 50%; background: #000;
  }` : '';
  // The status cluster follows the OS: iOS is signal+battery; Android leads with the wifi fan.
  const android = device.statusStyle === 'android';

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  /* Inlined, never fetched. An earlier version pointed the frame page at the SPA origin so this
     face would resolve, which mounted the whole Vue app; setContent then swapped the document out
     from under it and the app's pending timers re-rendered its dialogs into the frame — unstyled,
     since Vuetify's CSS went with the old document. The frame must never load the app. */
  @font-face { font-family: 'StoreFrame'; src: url(${fontDataUri}) format('truetype'); font-weight: 600; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${device.cssWidth}px; height: ${device.cssHeight}px; overflow: hidden; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(120% 80% at 50% 0%, #1c3fb0 0%, #10206b 45%, #070f38 100%);
    /* The app's own face, inlined above: -apple-system/Segoe UI resolve to something different on a
       Linux CI box, which would make the status bar drift between machines. */
    font-family: 'StoreFrame', sans-serif;
  }
  .stage { perspective: ${device.cssWidth * 3.5}px; perspective-origin: 50% 45%; }
  .phone {
    position: relative;
    width: ${device.screenW + device.bezel * 2}px; height: ${screenH + device.bezel * 2}px;
    border-radius: ${device.outerRadius}px;
    padding: ${device.bezel}px;
    background: linear-gradient(145deg, #c9ced8 0%, #6f747f 18%, #3c414c 42%, #767c88 68%, #b9bfc9 100%);
    transform: rotateX(${angle.rotateX}deg) rotateY(${angle.rotateY}deg) rotateZ(${angle.rotateZ}deg);
    box-shadow:
      0 ${device.bezel * 4}px ${device.bezel * 7}px rgba(0, 0, 0, .55),
      0 ${device.bezel}px ${device.bezel * 2}px rgba(0, 0, 0, .35),
      inset 0 0 2px rgba(255, 255, 255, .5);
  }
  /* The screen is a column: the app only ever occupies the middle (safe) strip, exactly as it does
     on iOS. The bands are painted with the app's own edge colours, sampled below. */
  .screen {
    position: relative; width: 100%; height: 100%;
    border-radius: ${device.screenRadius}px; overflow: hidden; background: #0b1440;
    display: flex; flex-direction: column;
  }
  .band { position: relative; flex: none; }
  .band.top { height: ${topBand}px; }
  .band.bottom { height: ${bottomBand}px; }
  #shot { flex: 1 1 auto; width: 100%; min-height: 0; object-fit: cover; object-position: top center; display: block; }
  .status {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: ${topBand * 0.15}px ${device.statusPad}px 0; color: #fff;
    font-size: ${device.statusFont}px; font-weight: 600; letter-spacing: .2px;
  }
  .status .right { display: flex; align-items: center; gap: 4px; }
  .bars { display: flex; align-items: flex-end; gap: 1.5px; height: ${device.statusFont * 0.78}px; }
  .bars i { width: ${device.statusFont * 0.22}px; background: #fff; border-radius: 1px; }
  .bars i:nth-child(1) { height: 33%; }
  .bars i:nth-child(2) { height: 55%; }
  .bars i:nth-child(3) { height: 78%; }
  .bars i:nth-child(4) { height: 100%; }
  .battery {
    width: ${device.statusFont * 1.74}px; height: ${device.statusFont * 0.87}px;
    border: 1px solid rgba(255,255,255,.65); border-radius: 3px; padding: 1.5px;
  }
  .battery span { display: block; width: 100%; height: 100%; background: #fff; border-radius: 1px; }
  .wifi {
    width: ${device.statusFont * 0.95}px; height: ${device.statusFont * 0.8}px;
    background: #fff; clip-path: polygon(50% 100%, 0 18%, 100% 18%);
  }
  .indicator {
    position: absolute; bottom: ${bottomBand * 0.3}px; left: 50%; transform: translateX(-50%);
    width: ${device.indicatorWidth}px; height: ${Math.max(3, bottomBand * 0.17)}px;
    border-radius: 2px; background: rgba(255, 255, 255, .85);
  }${islandCss}${punchCss}
</style></head>
<body>
  <div class="stage">
    <div class="phone">
      <div class="screen">
        <div class="band top" id="bandTop">
          <div class="status">
            <span>9:41</span>
            <span class="right">
              ${android ? '<span class="wifi"></span>' : ''}
              <span class="bars"><i></i><i></i><i></i><i></i></span>
              <span class="battery"><span></span></span>
            </span>
          </div>
          ${device.island ? '<div class="island"></div>' : ''}${device.punchHole ? '<div class="punch"></div>' : ''}
        </div>
        <img id="shot" src="${dataUri}" alt="">
        <div class="band bottom" id="bandBottom"><div class="indicator"></div></div>
      </div>
    </div>
  </div>
<script>
  // Sample the capture's own top and bottom edge so the bands continue the app's background instead
  // of guessing a colour that drifts whenever the theme changes.
  const img = document.getElementById('shot');
  const paint = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const at = (y) => {
      const [r, g, b] = ctx.getImageData(Math.floor(canvas.width / 2), y, 1, 1).data;
      return \`rgb(\${r}, \${g}, \${b})\`;
    };
    document.getElementById('bandTop').style.background = at(1);
    document.getElementById('bandBottom').style.background = at(canvas.height - 2);
    window.__framed = true;
  };
  if (img.complete) paint(); else img.addEventListener('load', paint);
</script>
</body></html>`;
}

/**
 * The Microsoft Store composite: the app window on a brand-gradient backdrop. The backdrop is
 * deliberately NOT a Windows wallpaper — that artwork is Microsoft's, not ours to put in a listing.
 * The chrome mirrors the real shell: a title bar in the app's own background colour (sampled from
 * the capture, as VpnHoodWpfSpaMainWindow tints its title bar), a minimize button, a disabled
 * maximize (the window is ResizeMode.CanMinimize), and a close button.
 */
function desktopFramePage(dataUri, device, fontDataUri) {
  const { width, height, windowWidth, titleBar } = device.canvas;
  const contentH = Math.round(windowWidth * (device.cssHeight / device.cssWidth));

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'StoreFrame'; src: url(${fontDataUri}) format('truetype'); font-weight: 600; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(120% 80% at 50% 0%, #1c3fb0 0%, #10206b 45%, #070f38 100%);
    font-family: 'StoreFrame', sans-serif;
  }
  .window {
    width: ${windowWidth}px; border-radius: 8px; overflow: hidden;
    box-shadow: 0 30px 70px rgba(0, 0, 0, .6), 0 8px 22px rgba(0, 0, 0, .4);
  }
  .titlebar {
    height: ${titleBar}px; display: flex; align-items: center; justify-content: space-between;
    padding-left: 14px; background: #06124b;
  }
  .titlebar .title { font-size: 12px; font-weight: 600; letter-spacing: .2px; color: rgba(255, 255, 255, .88); }
  .caption { display: flex; height: 100%; }
  .caption .btn { width: 46px; height: 100%; display: flex; align-items: center; justify-content: center; }
  .minimize i { display: block; width: 10px; height: 1px; background: #fff; }
  .maximize i { display: block; width: 9px; height: 9px; border: 1px solid #fff; opacity: .35; }
  .close { position: relative; }
  .close i, .close i::after {
    display: block; width: 13px; height: 1px; background: #fff; transform: rotate(45deg);
  }
  .close i::after { content: ''; transform: rotate(90deg); }
  #shot {
    display: block; width: ${windowWidth}px; height: ${contentH}px;
    object-fit: cover; object-position: top center;
  }
</style></head>
<body>
  <div class="window">
    <div class="titlebar" id="titlebar">
      <span class="title">${device.windowTitle}</span>
      <span class="caption">
        <span class="btn minimize"><i></i></span>
        <span class="btn maximize"><i></i></span>
        <span class="btn close"><i></i></span>
      </span>
    </div>
    <img id="shot" src="${dataUri}" alt="">
  </div>
<script>
  // The real title bar is tinted WindowBackgroundColor, which is also the app's page background —
  // so sample the capture's own top edge rather than hard-coding a colour that drifts with themes.
  const img = document.getElementById('shot');
  const paint = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const [r, g, b] = ctx.getImageData(Math.floor(canvas.width / 2), 1, 1, 1).data;
    document.getElementById('titlebar').style.background = \`rgb(\${r}, \${g}, \${b})\`;
    window.__framed = true;
  };
  if (img.complete) paint(); else img.addEventListener('load', paint);
</script>
</body></html>`;
}

/**
 * Resize through a canvas at imageSmoothingQuality 'high' rather than letting the screenshot land at
 * the output size directly — a deliberate 2:1 downsample of an already-rasterized image beats
 * Chromium's compositor filtering of a live layer. `cover: true` scale-crops instead of stretching
 * (top-aligned, matching the frames' object-position), for static sources whose aspect differs.
 */
async function downsample(page, buffer, width, height, cover = false) {
  const base64 = await page.evaluate(async ({ src, w, h, cover }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (cover) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, 0, dw, dh);
    }
    else {
      ctx.drawImage(img, 0, 0, w, h);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { src: `data:image/png;base64,${buffer.toString('base64')}`, w: width, h: height, cover });
  return recompressPng(Buffer.from(base64, 'base64'));
}

/**
 * Recompress a PNG without touching a single pixel. Chromium's `canvas.toDataURL('image/png')` —
 * the encoder every framed and bare shot above goes through — optimises for speed, not size, and
 * leaves roughly half the file on the table. Across a sample of the shipped Client set that is
 * 35.2 MB of PNG down to 18.3 MB, every byte of image data identical. Repo size is the point: an
 * IzzyOnDroid/F-Droid maintainer has to clone the store-asset repo to read our listing
 * (vpnhood/VpnHood#765), and it had grown to hundreds of megabytes.
 *
 * Decode to raw RGBA and re-encode with adaptive filtering at maximum deflate. `deflateStrategy: 0`
 * matters — the default (3, Z_RLE) is tuned for palette images and leaves these screenshots ~60%
 * larger than strategy 0 does.
 *
 * WHY NOT AN IMAGE LIBRARY: sharp/libvips shrinks these files ~6x rather than ~2x, which is
 * tempting until you diff the result — it alters up to 30% of subpixels by as much as 52/255 and
 * silently drops the (fully opaque) alpha channel, verified against an independent decoder. That is
 * a lossy re-encode wearing a lossless label. Store screenshots must not be quietly altered, so we
 * take the smaller, honest win.
 *
 * RESIZING IS NOT AVAILABLE either: App Store screenshots must keep Apple's exact device resolution
 * (1290x2796 and friends) or the upload is rejected. Google Play would allow smaller, but a
 * per-store resize policy is a product decision, not a compression one.
 *
 * Pure function of the input bytes, so it neither helps nor worsens the byte-stability problem
 * documented in e2e/store/README.md.
 */
function recompressPng(buffer) {
  const png = PNG.sync.read(buffer);
  const out = PNG.sync.write(png, { deflateLevel: 9, deflateStrategy: 0, filterType: -1 });
  // Never grow a file: an already-well-packed source would otherwise get bigger.
  return out.length < buffer.length ? out : buffer;
}

async function frameDevice(browser, resizer, platform, device, fontDataUri, rawDir, finalDir) {
  const { width: outW, height: outH } = finalSize(device);
  const framePage = device.frame === 'phone' || device.frame === 'desktop'
    ? await browser.newPage({
      viewport: device.frame === 'desktop'
        ? { width: device.canvas.width, height: device.canvas.height }
        : { width: device.cssWidth, height: device.cssHeight },
      deviceScaleFactor: (device.frame === 'desktop' ? 1 : device.scale) * FRAME_SUPERSAMPLE,
    })
    : null;

  let count = 0;
  for (const locale of selectedLocales)
  for (const shot of selected(platform)) {
    const name = fileName(device, shot, locale);
    const png = await fs.readFile(path.join(rawDir, name)).catch(() => null);
    if (!png) {
      console.log(`skipped   ${device.label.padEnd(11)} ${name}  (not in raw/${path.basename(rawDir)})`);
      continue;
    }

    if (framePage) {
      const html = device.frame === 'desktop'
        ? desktopFramePage(`data:image/png;base64,${png.toString('base64')}`, device, fontDataUri)
        : phoneFramePage(`data:image/png;base64,${png.toString('base64')}`, device, shot, fontDataUri);
      await framePage.setContent(html, { waitUntil: 'load' });
      await framePage.waitForFunction(() => window.__framed === true, { timeout: 10000 });
      const supersampled = await framePage.screenshot();
      await fs.writeFile(path.join(finalDir, name), await downsample(resizer, supersampled, outW, outH));
    }
    else {
      // Bare (Google Play style): the supersampled capture lands at store size through one
      // deliberate high-quality resize; a static source is cover-fitted the same way the frames do.
      await fs.writeFile(path.join(finalDir, name), await downsample(resizer, png, outW, outH, true));
    }
    console.log(`finalized ${device.label.padEnd(11)} ${name}  ${shot.label}`);
    count++;
  }

  await framePage?.close();
  return count;
}

/**
 * Deletes numbered files a directory should no longer contain, so a shrunk or reordered set cannot
 * leave stale screenshots behind — in a store installDir or in test-results. Matches by the owning
 * device's naming pattern (the iPhone pass cannot touch ipad_ files) and always against the FULL
 * shot list, never the --only/--locale filters, so a partial run cannot delete the rest.
 */
async function prune(dir, device, expected, pattern) {
  for (const existing of await fs.readdir(dir)) {
    if (!pattern.test(existing) || expected.has(existing)) continue;
    await fs.rm(path.join(dir, existing));
    console.log(`pruned    ${device.label.padEnd(11)} ${existing}  (no longer in the set)`);
  }
}

/** raw/ and final/ hold every locale side by side, locale-suffixed. */
const pruneWorkDir = (dir, platform, device) => prune(dir, device,
  new Set(platform.shots.flatMap(shot => locales.map(locale => fileName(device, shot, locale)))),
  new RegExp(`^${device.prefix}\\d+_[A-Za-z][\\w-]*\\.png$`));

/** The store folder a locale's set installs into on this platform's store: a `stores` override
 * wins (null: the store has no such locale, skip the set), the tag otherwise. */
const storeLocale = (platform, locale) =>
  locale.stores && platform.store in locale.stores ? locale.stores[platform.store] : locale.tag;

/**
 * Copies a platform's finals into its per-locale installDirs and prunes numbered files the set no
 * longer produces — so a shrunk set (e.g. TV going 8 -> 6) cannot leave stale screenshots for the
 * uploader to ship. Always installs every locale of the full shot list: a store directory is a
 * deliverable, never a partial, so a missing final fails the install rather than leaving a hole.
 */
async function installPlatform(platform, devices, finalDir) {
  if (!platform.installDir.includes('<locale>'))
    throw new Error(`${platform.label}: installDir "${platform.installDir}" has no <locale> token — every store keeps one directory per locale.`);

  // Some stores cap the set (Google Play: 8 per device type) while the run deliberately generates
  // every marketable screen — install ships the leading slice and names what it leaves out.
  const shots = platform.installMax ? platform.shots.slice(0, platform.installMax) : platform.shots;
  const capped = platform.shots.slice(shots.length);
  if (capped.length)
    console.log(`capped    ${platform.label}: installing 1-${shots.length}; left out: ${capped.map(s => `${s.num} ${s.label}`).join(', ')}`);

  for (const locale of locales) {
    const folder = storeLocale(platform, locale);
    if (folder === null) {
      console.log(`skipped   ${platform.label} ${locale.tag}: this store has no such locale`);
      continue;
    }

    const destDir = path.resolve(installRoot, platform.installDir.replaceAll('<locale>', folder));
    await fs.mkdir(destDir, { recursive: true });
    let copied = 0;

    for (const device of devices) {
      for (const shot of shots) {
        const from = path.join(finalDir, fileName(device, shot, locale));
        const to = path.join(destDir, installName(device, shot));
        // A static source that IS the installed file must not be overwritten with its own re-encode:
        // the pixels are identical and the byte churn would dirty every diff.
        if (shot.source && path.resolve(projectRoot, shot.source) === to) {
          console.log(`kept      ${device.label.padEnd(11)} ${installName(device, shot)}  (source is the installed file)`);
          continue;
        }
        if (!await fs.stat(from).catch(() => null))
          throw new Error(`${platform.label}: ${fileName(device, shot, locale)} is not in ` +
            `${path.relative(projectRoot, finalDir)} — run a full generation (no --only/--locale) before --install.`);
        await fs.copyFile(from, to);
        copied++;
      }

      // The pattern also matches the retired locale-suffixed naming, so an installDir written by an
      // older engine cleans itself up on the next install.
      await prune(destDir, device, new Set(shots.map(shot => installName(device, shot))),
        new RegExp(`^${device.prefix}\\d+(_[A-Za-z][\\w-]*)?\\.png$`));
    }

    console.log(`installed ${copied} file(s) -> ${path.relative(installRoot, destDir)}`);
  }
}

const selectedPlatforms = platformKeys.map(key => ({ key, ...PLATFORMS[key] }));
const needsSpa = doCapture && selectedPlatforms.some(p => selected(p).some(shot => !shot.source));
if (needsSpa && !liveApi && !await fs.stat(path.join(distDir, 'index.html')).catch(() => null))
  throw new Error(`No production build at ${path.relative(projectRoot, distDir)}. Run 'npm run build' first.`);

const spa = needsSpa && !liveApi ? await serveSpa() : null;
const origin = liveApi ?? spa?.origin ?? null;
const baseFixture = liveApi ? null : JSON.parse(await fs.readFile(fixturePath, 'utf8'));
console.log(liveApi ? `source: live client at ${liveApi}` : `source: mocked API over ${path.relative(projectRoot, distDir)}`);

// Only capture and frame render anything — an install-only run (--frame-only --capture-only
// --install, e.g. a CI assemble job merging per-locale artifacts) needs no browser at all.
const browser = doCapture || doFrame
  ? await chromium.launch().catch((err) => {
    throw new Error(`Could not launch Chromium — run 'npx playwright install --with-deps chromium' once.\n${err.message.split('\n')[0]}`);
  })
  : null;

// Let the project synthesize fixture data that needs a renderer (e.g. demo app icons) before any
// capture runs. Mock mode only — a live client answers /api/** itself.
if (!liveApi && doCapture)
  await prepare?.(browser, baseFixture);

for (const platform of selectedPlatforms) {
  const rawDir = path.join(outDir, 'raw', platform.key);
  const finalDir = path.join(outDir, 'final', platform.key);
  const devices = platformDevices(platform);
  if (devices.length === 0) continue;
  console.log(`\n=== ${platform.label} (${platform.key}) ===`);

  if (doCapture) {
    await fs.mkdir(rawDir, { recursive: true });
    const fixture = baseFixture ? deepMerge(baseFixture, platform.patch ?? {}) : null;
    const unhandled = new Set();
    for (const device of devices) {
      (await captureDevice(browser, platform, device, origin, fixture, rawDir)).forEach(u => unhandled.add(u));
      await pruneWorkDir(rawDir, platform, device);
    }
    if (unhandled.size)
      console.log(`unmocked endpoints (answered null, add to ROUTES in e2e/store/project.mjs):\n  ${[...unhandled].join('\n  ')}`);
  }

  if (doFrame) {
    await fs.mkdir(finalDir, { recursive: true });
    const resizer = await browser.newPage();
    const font = await fs.readFile(path.join(projectRoot, 'src', 'assets', 'fonts', 'Poppins-SemiBold.ttf'));
    const fontDataUri = `data:font/ttf;base64,${font.toString('base64')}`;
    let total = 0;
    for (const device of devices) {
      total += await frameDevice(browser, resizer, platform, device, fontDataUri, rawDir, finalDir);
      await pruneWorkDir(finalDir, platform, device);
    }
    await resizer.close();
    const sizes = devices.map(d => `${d.label} ${finalSize(d).width}x${finalSize(d).height}`);
    console.log(`${total} screenshot(s) in ${path.relative(projectRoot, finalDir)} — ${sizes.join(', ')}`);
  }

  if (doInstall && platform.installDir)
    await installPlatform(platform, devices, finalDir);
}

await browser?.close();
spa?.close();
