/**
 * Per-project store-screenshot configuration. THIS is the file a fork edits — the engine in
 * ../store-screenshots.mjs stays untouched.
 *
 * Three things live here: the PLATFORMS to produce (each with its capability patch, devices,
 * screens and install destination), the API ROUTES that answer the SPA from fixture.json, and the
 * prepare() hook that synthesizes fixture data needing a renderer (the demo app icons).
 *
 * The fixture is one recording (a Windows Release client), and each platform overlays its own
 * capability patch so the SPA renders exactly what that OS build shows. Patch values are NOT free to
 * invent — each one mirrors a device class in the VpnHood repo, cited next to the patch. When a
 * capability changes there, change it here.
 */
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const projectRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');

// A shared tilt reads as a deliberate treatment where a per-shot angle reads as drift. Straight-on
// is also the sharpest option: with no rotation there is no 3D subtree for Chromium to rasterize
// into a texture and resample. A shot can override with its own `angle`.
export const ANGLE = { rotateX: 0, rotateY: 0, rotateZ: 0 };

/**
 * Locales generated for every platform — every language the SPA ships (src/locales). `tag` is the
 * Google Play locale code, which is also the Microsoft Store folder and the filename suffix in
 * test-results; `culture` is the SPA language, applied through state.currentUiCultureInfo like the
 * client does. fa and ar exercise the whole RTL path (rtl.css, mirrored layouts).
 *
 * `--install` writes each locale into its own store directory (the <locale> token in installDir),
 * named by `tag` unless `stores` overrides it for that platform's store — App Store Connect spells
 * several codes differently, and null means the store has no such locale, so that set is skipped
 * there entirely.
 */
export const LOCALES = [
  { tag: 'en-US', culture: 'en' },
  { tag: 'ar', culture: 'ar', stores: { appStore: 'ar-SA' } },
  { tag: 'de-DE', culture: 'de' },
  { tag: 'es-ES', culture: 'es' },
  // App Store Connect offers no Persian locale at all, so the fa set cannot ship there.
  { tag: 'fa', culture: 'fa', stores: { appStore: null } },
  { tag: 'fr-FR', culture: 'fr' },
  { tag: 'hi-IN', culture: 'hi', stores: { appStore: 'hi' } },
  { tag: 'it-IT', culture: 'it', stores: { appStore: 'it' } },
  { tag: 'pt-BR', culture: 'pt-BR' },
  { tag: 'pt-PT', culture: 'pt' },
  { tag: 'ru-RU', culture: 'ru', stores: { appStore: 'ru' } },
  { tag: 'tr-TR', culture: 'tr', stores: { appStore: 'tr' } },
  { tag: 'zh-CN', culture: 'zh', stores: { appStore: 'zh-Hans' } },
];

/**
 * Patches applied to the mocked API for a shot, as a deep merge over fixture.json (after the
 * platform patch). Only the fields that matter to the screen need to appear.
 *
 * ConnectionInfo.vue renders `(speed * 10 / 1000000).toFixed(2)`, so 1 Mbps == 100_000 here. Only
 * ever use throughput the product actually sustains — it is a performance claim on a store page.
 */
const MBPS = 100_000;

const CONNECTED = {
  state: {
    connectionState: 'Connected',
    sessionStatus: { speed: { received: 116.4 * MBPS, sent: 89.39 * MBPS } },
  },
};

// The CLIENT app ships with no servers — users bring their own key, and the store page must not
// suggest a bundled server list (that is the VpnHood! CONNECT story).
const NO_SERVERS = { clientProfileInfos: [] };

/**
 * The Apps Filter page calls GET /api/app/installed-apps, which on a real device returns the
 * installed apps with their icons. The mock answers with famous apps whose icons are SYNTHESIZED by
 * prepare() below from the Material Design Icons webfont already shipped as a project dependency
 * (@mdi/font) — the same recognizable brand glyphs, without committing anyone's icon artwork as
 * fixture data.
 *
 * `bg`/`fg` take 1 colour (flat) or several (gradient); `icon` is the mdi glyph name, resolved
 * against the installed font's CSS at run time so a renamed glyph fails the run instead of shipping
 * a blank tile.
 */
const DEMO_APPS = [
  { appId: 'com.android.vending', appName: 'Play Store', icon: 'google-play', bg: ['#fff'], fg: ['#00c4ff', '#00e59d'] },
  { appId: 'com.whatsapp', appName: 'WhatsApp', icon: 'whatsapp', bg: ['#25D366'], fg: ['#fff'] },
  { appId: 'com.android.calculator', appName: 'Calculator', icon: 'calculator', bg: ['#43A047'], fg: ['#fff'] },
  { appId: 'com.android.calendar', appName: 'Calendar', icon: 'calendar-month', bg: ['#1E88E5'], fg: ['#fff'] },
  { appId: 'com.android.camera', appName: 'Camera', icon: 'camera', bg: ['#E53935'], fg: ['#fff'] },
  { appId: 'com.android.chrome', appName: 'Chrome', icon: 'google-chrome', bg: ['#4285F4'], fg: ['#fff'] },
  { appId: 'com.android.deskclock', appName: 'Clock', icon: 'clock-outline', bg: ['#5C6BC0'], fg: ['#fff'] },
  { appId: 'com.facebook.katana', appName: 'Facebook', icon: 'facebook', bg: ['#1877F2'], fg: ['#fff'] },
  { appId: 'com.google.android.gm', appName: 'Gmail', icon: 'gmail', bg: ['#fff'], fg: ['#EA4335'] },
  { appId: 'com.instagram.android', appName: 'Instagram', icon: 'instagram', bg: ['#F58529', '#DD2A7B', '#8134AF'], fg: ['#fff'] },
  { appId: 'com.google.android.apps.maps', appName: 'Maps', icon: 'google-maps', bg: ['#fff'], fg: ['#34A853'] },
  { appId: 'com.spotify.music', appName: 'Spotify', icon: 'spotify', bg: ['#1DB954'], fg: ['#fff'] },
  { appId: 'com.google.android.youtube', appName: 'YouTube', icon: 'youtube', bg: ['#FF0000'], fg: ['#fff'] },
];

/**
 * Renders the demo app icons through the engine's Chromium and plants them on the fixture before
 * any capture runs. Deterministic on any machine: fixed colours, and the glyph font is inlined so
 * nothing depends on what the box has installed.
 */
export async function prepare(browser, fixture) {
  // Resolve each glyph's codepoint from the installed @mdi/font CSS — fail loud on a miss.
  const mdiCss = await fs.readFile(path.join(projectRoot, 'node_modules', '@mdi', 'font', 'css', 'materialdesignicons.css'), 'utf8');
  const codepoint = (name) => {
    const match = mdiCss.match(new RegExp(`\\.mdi-${name}::before\\s*\\{\\s*content:\\s*"\\\\([0-9A-F]+)"`));
    if (!match) throw new Error(`@mdi/font has no glyph named "${name}" — pick another in DEMO_APPS.`);
    return parseInt(match[1], 16);
  };
  const apps = DEMO_APPS.map(app => ({ ...app, glyph: codepoint(app.icon) }));

  const mdiFont = await fs.readFile(path.join(projectRoot, 'node_modules', '@mdi', 'font', 'fonts', 'materialdesignicons-webfont.ttf'));
  const page = await browser.newPage();
  const icons = await page.evaluate(async ({ apps, fontB64 }) => {
    const face = new FontFace('MdiGlyphs', `url(data:font/ttf;base64,${fontB64})`);
    await face.load();
    document.fonts.add(face);

    const paint = (ctx, stops) => {
      if (stops.length === 1) return stops[0];
      const fill = ctx.createLinearGradient(0, 0, 96, 96);
      stops.forEach((stop, i) => fill.addColorStop(i / (stops.length - 1), stop));
      return fill;
    };

    return apps.map(app => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = paint(ctx, app.bg);
      ctx.fillRect(0, 0, 96, 96); // the app's list avatar clips to a circle itself
      ctx.fillStyle = paint(ctx, app.fg);
      ctx.font = '58px MdiGlyphs';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String.fromCodePoint(app.glyph), 48, 50);
      // The SPA prepends 'data:image/png;base64, ' itself (split-apps.vue), so strip the header.
      return canvas.toDataURL('image/png').split(',')[1];
    });
  }, { apps, fontB64: mdiFont.toString('base64') });
  await page.close();

  fixture.installedApps = apps.map((app, i) => ({
    appId: app.appId, appName: app.appName, iconPng: icons[i],
  }));
}

// "All except 2 apps": Play Store and WhatsApp ride outside the tunnel — the exact story the old
// hand-shot listing told.
const APPS_FILTER = {
  route: '/split-tunneling/split-apps', label: 'Apps Filter',
  patch: { userSettings: { splitTunneling: { appMode: 'Exclude', apps: ['com.android.vending', 'com.whatsapp'] } } },
};

// Every platform shoots Servers with NO_SERVERS: the page then renders its add-a-key guidance
// (and the pointer to VpnHood! CONNECT), which is the truthful CLIENT first-run story.
const SERVERS_EMPTY = { route: '/servers', label: 'Servers (empty)', patch: NO_SERVERS };

// The "IP Leak Risk" chip is an accurate in-app caution about a setting the user opts into (split
// tunneling exposes your IP to whatever you route around the tunnel — true of every VPN). Out of
// context on a store page it reads as a claim about the product. Hidden for the capture only; the
// app still shows it to anyone who turns the setting on.
const HIDE_LEAK_CHIP = ['.v-chip.text-warning'];

/**
 * Device fields by frame type:
 *   frame: 'phone'    bezel mockup around the capture — needs the safe-area and bezel geometry
 *                     fields; statusStyle 'android' swaps the iOS status cluster for wifi+signal+
 *                     battery and `punchHole` replaces `island`; final size = css * scale
 *   frame: 'none'     the bare capture; final size = css * scale
 *   frame: 'desktop'  the capture composited into an OS window on a backdrop — needs `canvas`;
 *                     final size = canvas.width x canvas.height
 *
 * cssWidth/cssHeight is always the CAPTURE viewport in CSS pixels. On iOS WebKit insets the visual
 * viewport to the safe area itself (no viewport-fit=cover, no env() use in the SPA); the same
 * capture-into-the-safe-strip approach is applied to the Android mockups, whose bands paint a
 * status bar and gesture pill. Safe insets are assumed rather than measured.
 */

const IOS_DEVICES = {
  'iphone-6.9': {
    label: 'iPhone 6.9"',
    prefix: '',
    frame: 'phone',
    cssWidth: 430, cssHeight: 932, scale: 3,   // -> 1290x2796, Apple's required iPhone slot
    safeTop: 59, safeBottom: 34,
    screenW: 344,
    bezel: 9, outerRadius: 54, screenRadius: 46,
    island: { width: 86, height: 25 },
    statusFont: 11.5, statusPad: 26,
    indicatorWidth: 105,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  },
  'ipad-13': {
    label: 'iPad 13"',
    prefix: 'ipad_',
    frame: 'phone',
    cssWidth: 1032, cssHeight: 1376, scale: 2, // -> 2064x2752, required while UIDeviceFamily has 2
    safeTop: 24, safeBottom: 20,
    screenW: 800,
    // Proportionally thicker bezel and squarer corners than the phone, and no Dynamic Island — an
    // iPad wearing an iPhone's cutout is the tell that a mockup was never checked.
    bezel: 20, outerRadius: 58, screenRadius: 40,
    island: null,
    statusFont: 9, statusPad: 34,
    indicatorWidth: 224,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  },
};

/**
 * AndroidDevice + AndroidDeviceUiProvider on a phone or tablet (every intent gate below is `!IsTv`
 * plus an API-level floor the Play target exceeds). Phones and tablets share one capability set —
 * only the viewport differs.
 */
const ANDROID_PATCH = {
  features: {
    osType: 'Android',                          // fixture records 'Windows'; drives OS-specific copy
    // AndroidDevice.IsExcludeAppsSupported / IsIncludeAppsSupported => true
    isExcludeAppsSupported: true,
    isIncludeAppsSupported: true,
  },
  intentFeatures: {
    isQuickLaunchSupported: true,             // AndroidDeviceUiProvider, API 24+ & !IsTv
    isRequestQuickLaunchSupported: true,
    isRequestNotificationSupported: true,     // API 33+ & !IsTv
    isPrivateDnsSettingsSupported: true,      // API 28+ & !IsTv
    isKillSwitchSettingsSupported: true,      // API 24+ & !IsTv
    isAlwaysOnSettingsSupported: true,        // API 24+ & !IsTv
    isSettingsSupported: true,
    isAppSettingsSupported: true,
    isAppNotificationSettingsSupported: true,
  },
  state: { isNotificationEnabled: true },
};

/**
 * Array order IS the store order — filenames number by position. The arc: proof first (connected,
 * real speeds), then the differentiator (Cloak Mode), then the CLIENT model told upfront (the
 * add-your-key Servers page), then Protocols, then the visually self-explanatory features and the
 * security promise. Tech pages follow, niche last. No Settings shot: every page it lists has its
 * own screenshot.
 *
 * Google Play accepts AT MOST 8 screenshots per device type. The set deliberately generates every
 * marketable screen — `--install` ships only the first 8 (installMax on the Play platforms).
 */
const ANDROID_SHOTS = [
  { route: '/', label: 'Home (connected)', patch: CONNECTED },
  { route: '/protocols/cloak-mode', label: 'Cloak Mode' },
  SERVERS_EMPTY,
  { route: '/protocols', label: 'Protocols' },
  APPS_FILTER,
  { route: '/split-tunneling', label: 'Split Tunneling', hide: HIDE_LEAK_CHIP },
  { route: '/settings/kill-switch', label: 'Kill Switch' },
  { route: '/dns', label: 'DNS' },                       // shows the Private DNS card too
  { route: '/settings/always-on', label: 'Always On' },
  { route: '/settings/quick-launch', label: 'Quick Launch' },
  { route: '/settings/proxies', label: 'Proxies' },
];

/**
 * Where `--install` copies the finals. Every installDir is a path INSIDE the repo that owns the
 * store assets, with `<locale>` standing for that store's locale folder; INSTALL_ROOT locates the
 * checkout of that repo relative to the WebUI repo root, and `--install-root` overrides it (a CI
 * caller points it at its own checkout). The npm script does NOT install — screenshots stay in
 * test-results/ unless `--install` is passed.
 */
export const INSTALL_ROOT = '../Vpnhood.App.Client';

/**
 * Release-notes config for store-release-notes.mjs: `product` picks which #client/#connect-tagged
 * CHANGELOG lines this app keeps; `ios: false` would suppress (and delete) the iOS "What's New"
 * files — only correct before an app's FIRST App Store version, which Apple rejects when it
 * carries release notes. The CLIENT is past 1.0, so iOS notes are on.
 */
export const RELEASE_NOTES = { product: 'client', ios: true };

export const PLATFORMS = {
  ios: {
    label: 'App Store',
    store: 'appStore',
    installDir: 'fastlane/screenshots/ios/<locale>',
    // The fixture IS the iOS capability profile. It was recorded from a Windows Release client, and
    // WinDevice/WinDeviceUiProvider gate off the same features IosDevice does — no app split, no
    // Private DNS, no kill switch (see the table in fastlane/README.md). Only osType has to be
    // corrected: the SPA drops the VpnHood! CONNECT pointer on the Servers screen for App Store
    // builds, and with the fixture's recorded 'Windows' the capture would show copy iOS never renders.
    patch: { features: { osType: 'Ios' } },
    devices: IOS_DEVICES,
    shots: [
      {
        route: '/', label: 'Home (connected)',
        // The only screen that needs a session. Everything else looks identical disconnected, which
        // is why the fixture does not have to simulate a whole tunnel.
        patch: CONNECTED,
      },
      { route: '/protocols/cloak-mode', label: 'Cloak Mode' },
      SERVERS_EMPTY,
      { route: '/protocols', label: 'Protocols' },
      { route: '/split-tunneling', label: 'Split Tunneling', hide: HIDE_LEAK_CHIP },
      { route: '/dns', label: 'DNS' },
      { route: '/settings/proxies', label: 'Proxies' },
    ],
  },

  'android-phone': {
    label: 'Google Play',
    store: 'googlePlay',
    installDir: 'fastlane/metadata/android/<locale>/images/phoneScreenshots',
    // Google Play accepts at most 8 screenshots per device type — see the note above ANDROID_SHOTS.
    installMax: 8,
    patch: ANDROID_PATCH,
    devices: {
      'android-phone': {
        label: 'Android',
        prefix: '',
        frame: 'phone',
        statusStyle: 'android',
        cssWidth: 360, cssHeight: 740, scale: 4,  // -> 1440x2960, same as the hand-shot set
        safeTop: 28, safeBottom: 20,
        screenW: 288,
        bezel: 4, outerRadius: 40, screenRadius: 36,  // slim rim: a modern Android is nearly all screen
        island: null, punchHole: { size: 12 },
        statusFont: 11, statusPad: 22,
        indicatorWidth: 96,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      },
    },
    shots: ANDROID_SHOTS,
  },

  'android-tablet-7': {
    label: 'Google Play 7" tablet',
    store: 'googlePlay',
    installDir: 'fastlane/metadata/android/<locale>/images/sevenInchScreenshots',
    installMax: 8,
    patch: ANDROID_PATCH,
    devices: {
      'android-tablet-7': {
        label: 'Tablet 7"',
        prefix: '',
        frame: 'phone',
        statusStyle: 'android',
        cssWidth: 600, cssHeight: 960, scale: 2,  // -> 1200x1920, a Nexus-7-class panel
        safeTop: 24, safeBottom: 18,
        screenW: 480,
        bezel: 14, outerRadius: 36, screenRadius: 26,
        island: null, punchHole: null,            // tablet cameras sit on the long edge — no cutout
        statusFont: 10, statusPad: 26,
        indicatorWidth: 140,
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',   // tablet UA carries no "Mobile"
      },
    },
    shots: ANDROID_SHOTS,
  },

  'android-tablet-10': {
    label: 'Google Play 10" tablet',
    store: 'googlePlay',
    installDir: 'fastlane/metadata/android/<locale>/images/tenInchScreenshots',
    installMax: 8,
    patch: ANDROID_PATCH,
    devices: {
      'android-tablet-10': {
        label: 'Tablet 10"',
        prefix: '',
        frame: 'phone',
        statusStyle: 'android',
        cssWidth: 800, cssHeight: 1280, scale: 2, // -> 1600x2560
        safeTop: 24, safeBottom: 18,
        screenW: 640,
        bezel: 18, outerRadius: 42, screenRadius: 30,
        island: null, punchHole: null,
        statusFont: 10, statusPad: 30,
        indicatorWidth: 180,
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    },
    shots: ANDROID_SHOTS,
  },

  'android-tv': {
    label: 'Google Play TV',
    store: 'googlePlay',
    installDir: 'fastlane/metadata/android/<locale>/images/tvScreenshots',
    installMax: 8,
    // AndroidDevice with AndroidUtils.IsTv() true: app split stays supported, but every
    // AndroidDeviceUiProvider intent is gated on !IsTv — so intentFeatures keep the fixture's
    // all-false baseline, and the SPA switches to its isTv layout.
    patch: {
      features: {
        osType: 'Android',
        isTv: true,
        isExcludeAppsSupported: true,
        isIncludeAppsSupported: true,
      },
    },
    devices: {
      'android-tv': {
        label: 'Android TV',
        prefix: '',
        // Bare on purpose even though the other Android sets are framed: a TV screenshot IS the
        // full 16:9 panel — wrapping it in a TV bezel would just shrink the app into letterboxing.
        frame: 'none',
        // -> 1920x1080 landscape, the tvScreenshots size. 1280x720 CSS (a 720p/tvdpi-class panel)
        // rather than 960x540 (1080p/xhdpi): both exist on real TVs, and the roomier one fits the
        // whole home page — at 540 CSS the config rows clip before the PROTOCOL row.
        cssWidth: 1280, cssHeight: 720, scale: 1.5,
        safeTop: 0, safeBottom: 0,
        isMobile: false, hasTouch: false,
        userAgent: 'Mozilla/5.0 (Linux; Android 12; ADT-3) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    },
    // No Apps Filter (FilterList is finger-driven and the page is not in the TV remote flow) and no
    // Kill Switch / Always On / Quick Launch (every one is gated `!IsTv`).
    shots: [
      { route: '/', label: 'Home (connected)', patch: CONNECTED },
      { route: '/protocols/cloak-mode', label: 'Cloak Mode' },
      SERVERS_EMPTY,
      { route: '/protocols', label: 'Protocols' },
      { route: '/split-tunneling', label: 'Split Tunneling', hide: HIDE_LEAK_CHIP },
      { route: '/dns', label: 'DNS' },
      { route: '/settings/proxies', label: 'Proxies' },
    ],
  },

  windows: {
    label: 'Microsoft Store',
    store: 'microsoftStore',
    // No fastlane lane exists for the Microsoft Store — upload via Partner Center or the msstore CLI.
    installDir: 'store/microsoft/<locale>/screenshots',
    // No patch: the fixture was recorded from this exact build (WinDevice in Release: no app split,
    // WinDeviceUiProvider: no settings intents).
    patch: {},
    devices: {
      'windows-desktop': {
        label: 'Windows',
        prefix: '',
        frame: 'desktop',
        // The real WPF window is a fixed 400x700 (AppResources.WindowSize, ResizeMode.CanMinimize),
        // far under the Store's 1366x768 floor — so the capture is composited into a desktop scene.
        cssWidth: 400, cssHeight: 700, scale: 3,
        safeTop: 0, safeBottom: 0,
        isMobile: false, hasTouch: false,
        canvas: { width: 1920, height: 1080, windowWidth: 520, titleBar: 40 },
        windowTitle: 'VpnHood! CLIENT',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      },
    },
    shots: [
      { route: '/', label: 'Home (connected)', patch: CONNECTED },
      { route: '/protocols/cloak-mode', label: 'Cloak Mode' },
      SERVERS_EMPTY,
      { route: '/protocols', label: 'Protocols' },
      { route: '/split-tunneling', label: 'Split Tunneling', hide: HIDE_LEAK_CHIP },
      { route: '/dns', label: 'DNS' },
      { route: '/settings/proxies', label: 'Proxies' },
    ],
  },
};

/**
 * Endpoints the mock answers, on top of the (platform-patched) fixture. The SPA's startup path is
 * POST /api/app/configure followed by GET /api/app/state polling; everything else is per-page.
 * Unmatched /api/** calls are logged by the engine rather than silently 404ing, so a screen that
 * starts needing a new endpoint shows up as a warning instead of a broken screenshot.
 */
export const ROUTES = {
  'POST /api/app/configure': (fixture) => fixture,
  // Returns the whole AppConfig, not void: answering null here wipes features on the client and
  // VpnHoodApp.getVersion() then throws on `fullVersion.split('.')`, which cascades into an error
  // dialog over the screenshot.
  'PATCH /api/app/configure': (fixture) => fixture,
  'GET /api/app/config': (fixture) => fixture,
  'GET /api/app/state': (fixture) => fixture.state,
  'GET /api/client-profiles': (fixture) => fixture.clientProfileInfos,
  'GET /api/app/installed-apps': (fixture) => fixture.installedApps ?? [],
  'PUT /api/app/user-settings': () => null, // void
};
