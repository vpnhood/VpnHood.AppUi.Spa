/**
 * Website screenshot overrides — used by VpnHood.www, not by any store.
 *
 * The store devices are fixed to a real handset viewport (360x740), which is correct for a store
 * listing but crops any app screen that scrolls. The website shows a whole screen at once, so this
 * config keeps everything from ./project.mjs and only makes the phone viewport tall enough for the
 * longest screens. Capture with --capture-only and take the PNGs from raw/: the website supplies
 * its own frame, so the store's device mockup is not wanted.
 *
 *   node e2e/store-screenshots.mjs --project e2e/store/project.web.mjs \
 *        --platform android-phone --only 6 --locale en-US --capture-only
 */
export * from './project.mjs';
import { PLATFORMS as BASE, ROUTES as BASE_ROUTES } from './project.mjs';

const PHONE = BASE['android-phone'].devices['android-phone'];

// A rated proxy list for the Smart Proxies feature page: the default screen is "No Proxy" and
// shows nothing of the rating, rotation or statistics. Hosts are RFC 5737 documentation
// addresses, so the shot never points at a real machine.
const ep = (protocol, host, port, quality, succeeded, failed, latencyMs, isEnabled = true) => ({
  endPoint: { id: `${protocol}-${host}-${port}`, isEnabled, protocol, host, port, username: null, password: null },
  status: {
    penalty: 0, succeededCount: succeeded, failedCount: failed, queuePosition: 0, quality,
    latency: latencyMs == null ? null : `00:00:00.${String(latencyMs).padStart(3, '0')}0000`,
    lastSucceeded: succeeded ? '2026-09-06T10:12:00Z' : null,
    lastFailed: failed ? '2026-09-06T09:58:00Z' : null,
    errorMessage: quality === 'Failed' ? 'Connection timed out.' : null,
  },
  countryCode: null,
});

const PROXY_ENDPOINTS = {
  items: [
    ep('Socks5', '203.0.113.9', 1080, 'Excellent', 14, 0, 140),
    ep('Https', 'proxy.example.net', 443, 'Excellent', 11, 0, 162),
    ep('Socks5', '198.51.100.33', 1080, 'Good', 9, 1, 210),
    ep('Http', '192.0.2.100', 3128, 'Good', 6, 1, 245),
    ep('Socks4', '203.0.113.162', 1080, 'Fair', 4, 2, 480),
    ep('Http', '198.51.100.192', 8080, 'Poor', 2, 3, 900),
    ep('Socks5', '192.0.2.14', 1080, 'Failed', 0, 4, null),
    ep('Https', '203.0.113.74', 443, 'Unknown', 0, 0, null, false),
  ],
  totalCount: 8,
};

const PROXY_CONNECTOR_STATUS = {
  sessionStatus: {
    succeededCount: 23, failedCount: 2, latency: '00:00:00.1400000',
    lastSucceeded: '2026-09-06T10:12:00Z', lastFailed: '2026-09-06T09:58:00Z', errorMessage: null,
  },
  succeededServerCount: 6, failedServerCount: 1, unknownServerCount: 0, disabledServerCount: 1,
};

// Screens the website shows that the stores do not: the split-tunneling children. Appended after
// the store shots so the store numbering (1-11) is unchanged; these are 12 onwards. No `hide`:
// the leak chip only appears on the parent screen, and the engine fails a shot whose selector
// matches nothing.
const WEB_EXTRA_SHOTS = [
  { route: '/split-tunneling/split-countries', label: 'Split Countries' },
  { route: '/split-tunneling/split-domains', label: 'Split Domains' },
  { route: '/split-tunneling/split-ips-via-device', label: 'Split IPs Via Device' },
  { route: '/split-tunneling/split-ips-via-app', label: 'Split IPs Via App' },
  { route: '/split-tunneling/split-local-network', label: 'Split Local Network' },
  { route: '/split-tunneling/split-dns', label: 'Split DNS' },
  {
    route: '/settings/proxies', label: 'Smart Proxies',
    patch: {
      userSettings: {
        proxySettings: {
          mode: 'Manual',
          autoUpdateOptions: { url: 'https://example.com/proxies.txt', interval: '01:00:00' },
        },
      },
      state: { isProxyEndPointActive: true, proxyConnectorStatus: PROXY_CONNECTOR_STATUS },
      proxyEndPoints: PROXY_ENDPOINTS,
    },
  },
];

// The proxy list endpoints, answered from the shot's patch (the store project never mocks them
// because no store shot opens the Manual list).
export const ROUTES = {
  ...BASE_ROUTES,
  'GET /api/proxy-endpoints': (fixture) => fixture.proxyEndPoints ?? { items: [], totalCount: 0 },
  'GET /api/proxy-endpoints/device': () => null,
};

export const PLATFORMS = {
  'android-phone': {
    ...BASE['android-phone'],
    shots: [...BASE['android-phone'].shots, ...WEB_EXTRA_SHOTS],
    devices: {
      'android-phone': {
        ...PHONE,
        // Generous: taller than any screen, so nothing is cropped. The website's asset step
        // trims the uniform background off the bottom, so extra height costs nothing.
        cssHeight: 1500,
      },
    },
  },
};
