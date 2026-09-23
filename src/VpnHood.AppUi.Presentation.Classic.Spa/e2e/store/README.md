# Store pipeline — maintainer's map

This document is the entry point for maintaining the store screenshot/listing pipeline. It is
written for a maintainer with **zero context** — human or AI — because the code was built and is
maintained without line-by-line review. Read this before changing anything; update it when the
shape of the system changes. Detailed *why* lives as comments at the top of each file named below —
this file tells you which file owns what, which invariants must hold, and how to verify a change
without trusting anyone's memory.

## The system in one paragraph

The **WebUI repo** (this repo) owns every tool but one: the harness that draws the Avalonia UI for
the screenshot engine lives in the main repo beside the UI it draws (see "Renderers"). The
**store-asset repos** (`vpnhood/Vpnhood.App.Client`, `vpnhood/Vpnhood.App.Connect`) own the
*content*: translatable source texts, generated screenshots, compiled fastlane trees — no app
source. The **main repo** (`vpnhood/VpnHood`) owns every *publish action*: binaries, GitHub
releases, and the shared listing workflow that the store repos call. Nothing ever writes across repo boundaries, which is what keeps
the whole pipeline free of PATs: a reusable workflow runs in its **caller's** context, so when a
store repo calls main's workflow, checkouts and commits land on the store repo with its own token.

## Data flow

```
store-i18n/en-US/store.json     hand-written EN source texts   (store repo)
store-i18n/en-US/subscriptions.json   hand-written EN subscription texts (store repo)
        │ vhtranslator (Gemini) → 12 sibling locales (both files, same run)
        ▼
store-metadata.mjs              compiles texts → fastlane/metadata/{android,ios}/<locale>/*.txt
store-screenshots.mjs           renders the UI against fixture.json → fastlane screenshots/images
                                (the SPA in Chromium, or the Avalonia UI through the main repo's
                                harness — "Renderers" below)
store-subscriptions.mjs         pushes subscription texts DIRECT to App Store Connect (no fastlane
                                path exists for in-app-purchase localizations), run by hand
        │  both run in update-screenshots.yml (store repo), which commits the results
        │  CLIENT uses the built-in e2e/store/*; CONNECT passes its own store/project.mjs
        │  + store/fixture.json through the action's `project` input
        ▼
publish_listing.yml (stub, store repo) → publish_listing.yml (main, reusable)
        ├─ gate: store-publish-state.mjs   fingerprint vs fastlane/publish-state.json
        ├─ _publish_listing_appstore.yml   deliver (text) + store-asc-screenshots.mjs (images)
        ├─ _publish_listing_play.yml       fastlane supply (text + checksum-synced images)
        └─ record: commits updated fingerprints back to the store repo
```

Binaries are a separate, parallel path: `publish_client.yml` / `connect_publish.yml` →
`publish_app.yml` → build modules → TestFlight / Play / GitHub release. A release uploads the
binary and its changelog and **never** the listing (see the `playstore` lane comments).

**Release notes** ("What's New") have their own source — the monorepo's hand-maintained
CHANGELOG.md — and their own refresh workflow, but ride the same translation and shipping rails:

```
vpnhood/VpnHood CHANGELOG.md    first H1 section ("# Latest"), hand-written EN, line tags:
        │                       #client/#connect (product) · #android #ios #windows #linux
        │                       (platforms, inclusive; none = all) · #store (Play's short note)
        ▼ store-release-notes.mjs extract     runs in update-release-notes.yml (store repo)
store-i18n/en-US/release-notes.json   one key per line (content-hashed: an edited line is
store-i18n/release-notes.map.json     retranslated, the rest reused) + order/routing map
        │ vhtranslator (same run) → sibling locales, changed lines only
        ▼ store-release-notes.mjs compile
fastlane/metadata/ios/<locale>/release_notes.txt          ships with the LISTING publish
fastlane/metadata/android/<locale>/changelogs/default.txt ships with the RELEASE (any versionCode)
```

## The tools (all in `e2e/`)

| file | contract |
|---|---|
| `store/project.mjs` | All per-app config: locales (+ per-store code overrides), platforms, devices, shots, install dirs. Data only — change *what* is generated here, never in the engine. This built-in copy is the **CLIENT**; CONNECT owns its own at `Vpnhood.App.Connect/store/project.mjs`, passed via `--project` (the action's `project` input). A store repo's config must import nothing outside Node built-ins — the workflow's `plan` job imports it in a checkout with no `node_modules` — and resolves engine assets through `process.cwd()`, which the action sets to the engine root. |
| `store/fixture.json` | The mocked `/api/app` state screenshots render against. Never real keys/IPs/IDs. Connect's sits beside its project file. Anything derived from app logic (per-location `options`, category tags) must be computed with the rules in `ClientServerLocationInfo.cs`, never hand-written, or the listing can claim a tier the app would not grant. |
| `store-screenshots.mjs` | Renders, frames, and installs screenshots. Two renderers draw the captures — `spa` (default) and `avalonia` (`--renderer avalonia`, see "Renderers") — and the frame and install phases do not care which. Every written PNG goes through `recompressPng` — Chromium's canvas encoder leaves ~half the file on the table, so this recompresses **pixel-for-pixel** (verified against an independent decoder; an image library was rejected for altering subpixels while claiming lossless). ~2x smaller, which is what keeps the store-asset repos clonable for the F-Droid/IzzyOnDroid catalogues. Intended to be deterministic (same inputs → same bytes) — but see "Known non-determinism" below; it does not hold for text-heavy pages. |
| `store-metadata.mjs` | Compiles `store-i18n` texts into fastlane trees. Fails loud on limits/missing keys/platform names in iOS copy (Guideline 2.3.10). `--check` validates without writing. |
| `store-release-notes.mjs` | Release notes from the monorepo CHANGELOG: `extract` (first H1 section → per-line store-i18n source + routing map) and `compile` (translations → iOS `release_notes.txt`, cap 4000, 2.3.10-linted; Play `changelogs/default.txt` from the `#store` lines, cap 500). Config is the project file's `RELEASE_NOTES` export — `product` picks the `#client`/`#connect` lines, `ios: false` deletes the iOS files (Apple rejects a FIRST App Store version that carries "What's New"). Missing map = not adopted, warn + skip; anything else wrong = red. |
| `store-publish-state.mjs` | Fingerprints what a publish would send; compares with `fastlane/publish-state.json` in the store repo. Text hashed as LF (CRLF checkouts must fingerprint identically to CI). Record only after a **verified** publish. |
| `store-asc-screenshots.mjs` | Checksum-sync of App Store screenshots (the Play `sync_image_upload` equivalent). Replaces deliver's delete-all mode. Phased against Apple's ghost-delete 500s — the file header documents the observed evidence. `--check` reports drift. |
| `store-icon.mjs` | Strips alpha from iOS appiconsets (ITMS-90717). Refuses genuinely translucent pixels. |
| `store-subscriptions.mjs` | Pushes subscription texts (group name, per-product name + description) from `store-i18n/*/subscriptions.json` straight to App Store Connect. Not part of the listing publish: fastlane has no in-app-purchase localization path, so `deliver` cannot carry these and the API is the only route. Keys are product ids, so a fork edits the JSON and no code — same choice `asc-iap.mjs` makes with `--products`. Enforces Apple's limits (name 30, description 45) before sending, and prints each product's state afterwards because editing a `READY_TO_SUBMIT` product can move it. Idempotent; `--check` reports drift. Play needs no equivalent — Google takes subscription texts from the Play Console only. |

## Renderers

The capture phase can draw the screens with either UI. The shot list, the fixture, the patches,
the frame pass and the install are the same for both.

| renderer | what draws | needs |
|---|---|---|
| `spa` (default) | this repo's SPA production build in Chromium, its `/api/**` answered from the fixture by the project's `ROUTES` | `npm run build`, Chromium |
| `avalonia` (`--renderer avalonia`) | the Avalonia UI (`VpnHood.AppUi.Presentation.Classic.Avalonia`) drawn headless by the **VpnHoodStoreScreenshots** harness, main repo `src/Apps/Tools/StoreScreenshots` — one process per shot, given the merged fixture as a file | the harness built (`dotnet build -c Release` of that project), the UI's asset store synced (`src/AppUi/VpnHood.AppUi.Assets.Classic/_sync-assets.ps1` in the main repo, after this repo's `npm run build`), Chromium for `prepare()` and the frame pass |

`--harness` names the harness executable and `--assets` the store folder; both default to a
`VpnHood` checkout beside this repo (`bin/Release/net10.0/VpnHoodStoreScreenshots[.exe]` and
`src/AppUi/VpnHood.AppUi.Assets.Classic/assets`). The harness takes a shot in the engine's own vocabulary — route,
viewport in logical pixels, scale (device ratio × supersample), culture, hide list, output path — so
its raw PNG lands in `raw/<platform>/` at exactly the size the frame pass expects. It fails loudly
on what the SPA path fails on: a dialog, snackbar or update notice over the page, an error the UI
logged or the dispatcher caught, a hide path that matches nothing, a culture the store has no
words for, a route it has no page for. API calls the fixture cannot answer are thrown at the page
and reported (`unmocked`), aggregated per platform like the SPA's unmocked endpoints. A member the
API contract now requires and the fixture predates is filled with a plain-CLIENT default and
reported once per run (`fixture.json is behind the API contract`) — the fix is re-recording the
fixture from a current client, never editing the harness's defaults.

**What the product IS, the harness refuses to invent**: `features.uiTheme`, `logoAssetPath`,
`privacyConsentAssetName`, `privacyPolicyUrl` and `termsOfUseUrl` must be in the fixture, or the run
fails naming them. They are what makes a screenshot CLIENT rather than CONNECT, and a fill would
produce a set that looks right wearing the other product's brand — Connect's fixture predated the
Avalonia UI (it carried the SPA-era `uiName` alone) and would have rendered blue with the Client
logo. Copy them from the product's own head (`src/Apps/<product>/<head>/AppConfigs.cs`, or
`src/Apps/Tools/AvaloniaUI.Dev/Program.cs` for a whole product at once).

Animations that never end (the `flasher` pulse on the Servers page's "(Recommended)", the
`spinner`) would be caught mid-stroke, making the same shot differ every run and keeping the page
from ever coming to rest. Avalonia 12 keeps its animation clock internal, so the harness takes the
class off every control instead (`--freeze`, default `flasher`) — the counterpart of the
`reducedMotion: 'reduce'` the SPA renderer asks Chromium for. A shot may still log `the page kept
changing`: that is the settle wait failing to *prove* stillness, not proof of movement (the bytes
are stable across runs).

What differs per renderer in `project.mjs`:

- `hide` is a CSS selector list for the SPA; `hideAvalonia` is a list of control-name paths for
  the Avalonia UI (`x:Name`s from the page down, e.g. `EnabledItem/WarningChip`). A shot with
  `hide` and no `hideAvalonia` fails the Avalonia run — write `hideAvalonia: []` to hide nothing.
- Numbers in a patch must have the app's own type: the fixture goes through the typed API, so a
  patch value for an integer field must be a whole number. `82.4 * 100_000` is 8240000.000000001 in
  JavaScript and fails the shot, which is why the speeds go through `mbps()`. The SPA renderer,
  reading the same JSON in JavaScript, never minded.
- `route` names the page in both. The harness maps each route to its Avalonia view in
  `PageRoutes.cs`; a new shot on a new page needs a line there, and an unknown route fails the run
  listing the known ones.
- `ROUTES`, `userAgent`, `isMobile`/`hasTouch` are SPA-only. The harness reads the fixture through
  the app's typed API (`VpnHoodApi`), which is why the fixture must keep the `AppInfo` shape.
- `--api` (a live client) is SPA-only.

The merged fixture of every shot is kept under `test-results/store-screenshots/fixture/<platform>/`,
so any capture can be re-run by hand with the harness alone — the usual way to chase a wrong pixel.

> [!WARNING]
> **One output folder, whichever app.** `test-results/store-screenshots/` does not depend on
> `--project`, and CLIENT and CONNECT share platform keys (`ios`, `android-phone`, `android-tv`),
> so generating one app locally overwrites the other app's raw and final files of those platforms.
> In CI this cannot happen — each store repo's job has its own workspace — but a local run of both
> must move or copy the first app's `test-results/store-screenshots/` aside before starting the
> second.

## Invariants — do not break these

1. **Generated files are never hand-edited**: fastlane trees come from the compiler/engine;
   `store-i18n/<non-en>/` comes from vhtranslator; only `store-i18n/en-US/store.json` and
   `store-i18n/en-US/subscriptions.json` are written by hand. `store-i18n/en-US/release-notes.json` and `release-notes.map.json` are generated too
   (from the monorepo CHANGELOG — the hand-written surface is the CHANGELOG's `# Latest` section).
   Hand-edits are silently overwritten by the next generation run.
2. **No repo writes to another repo.** If a change seems to need that, the design is wrong or a
   deliberate credential decision is being made (see main's `docs/cicd/deployment.md`).
3. **`publish-state.json` records only verified publishes.** A cancelled or failed store leg must
   not be recorded — otherwise the gate skips a store that never got the content. The workflow's
   `record` job enforces this via each module's `published` output.
4. **Fail loud.** Every tool throws on missing files, unknown locales, limit overflows. Never add
   a silent fallback; VpnHood is fail-closed by policy.
5. **Missing credential = warn + skip + green; present-but-failing = red.** The fork-friendliness
   convention, documented per-secret in main's `docs/cicd/deployment.md`.
6. **iOS copy never names other platforms** (Android/Google Play/Windows/Linux) — App Store
   Guideline 2.3.10. The compiler lints texts; screenshots must respect it too (the Servers page
   promo was removed on iOS for this — don't reintroduce it).

## Known non-determinism (open)

`store-screenshots.mjs` is *meant* to be byte-deterministic, and the gate assumes it: a shot that
re-renders differently is re-uploaded to every store on every run, which is exactly what the
fingerprint gate exists to prevent — and repeated App Store screenshot replacement is the fragile
path (see the ghost-delete note below).

**It does not hold for text-heavy pages.** Reproduced on Connect's Servers shot (a 22-row location
list): six identical local runs produced **two** distinct outputs. The diff is ~4,200 sparse pixels
confined to the text-glyph band, and the two states *cluster* across consecutive runs rather than
alternating randomly — which points at the rasterization path, not at app or fixture behaviour.

Ruled out: a webfont race. Awaiting `document.fonts.ready` before capture does **not** fix it
(tested, then reverted — do not re-add it as a fix without new evidence).

Still untested: forcing deterministic text rasterization at launch
(`--disable-lcd-text`, `--font-render-hinting=none`, `--force-color-profile=srgb`). That would
re-render every shot in both apps, so it needs its own verified change, not a drive-by.

The CLIENT does not show this today only because its Servers shot is the short add-a-key screen.
Any new long, text-dense shot will inherit the problem.

The `avalonia` renderer does not have it: three runs of the text-heavy Protocols shot (Android
phone, 2880×5536) produced byte-identical PNGs (2026-09-21). Skia in software, no compositor.

## Apple lore (hard-won, with evidence)

- **Screenshot replace = delete + create of the same fileName.** Apple's deletes are eventually
  consistent; a create that reuses a just-deleted name can 500 **and keeps 500ing while retried**
  (observed >15 min), yet succeeds when tried once later. Hence the phased sync. Never reintroduce
  a delete-everything re-upload (deliver's `overwrite_screenshots`) into CI.
- **A cancelled screenshot push scrambles display order** (uploads land in completion order; the
  ordering PATCH runs last). `store-asc-screenshots.mjs` restores order even on failed runs.
- **First-version quirks**: v1 has no "What's New" (`release_notes.txt` must not exist for it —
  `RELEASE_NOTES.ios: false` in the project config keeps it deleted); deliver's first-version text
  push raises a benign "No data" (rescued in each store repo's Fastfile `upload_metadata` lane —
  removable once 1.0 is live).
- **"What's New" is never carried over to a new version** — the field starts empty and is required
  per localization once the app has a prior release. The fingerprint gate compares only repo
  content, so before honoring a skip it probes the live listing
  (`store-asc-screenshots.mjs --whatsnew-check`, exit 4 = empty fields to fill) and pushes the
  otherwise-unchanged text to fill them. No manual `force=true` needed for this case.
- **The listing locks while a version is in review or live with none open.** That is a normal
  state between releases: the appstore module probes it (`--editable-check`, exit 3 = locked) and
  warns + skips with `published=false`, so the gate re-publishes once a version opens. A locale on
  the listing without local screenshots is likewise a warn-and-skip (staged rollout — text ships
  before screenshots; the storefront falls back to the primary locale's images), while local
  screenshots for a locale the listing lacks stay a hard error.
- **ASC API**: JWT ES256, `exp` ≤ 20 min (Apple rejects at the cap; use 15). Subtitle and privacy
  URL live on `appInfoLocalizations`; description/keywords/promo/URLs on
  `appStoreVersionLocalizations`. `sourceFileChecksum` is the MD5 of the uploaded file — the basis
  of the sync diff.
- **Review submissions are a basket (`reviewSubmissions`) whose contents are near-opaque.** Items
  list with **empty relationships**, and `GET /v1/reviewSubmissionItems/<id>` is **403**, so the only
  way to know what is in a basket is to base64-decode the item id: it is
  `<submissionId>|<typeCode>|<targetId>`. Type codes seen so far — `6` appStoreVersion, `18`
  subscriptionVersion, `19` subscriptionGroupVersion.
- **To add a subscription to a submission, add its VERSION, not the product.** `reviewSubmissionItems`
  has no `subscription` relationship — that returns `409 ENTITY_ERROR.RELATIONSHIP.UNKNOWN`, which
  reads like a key/role problem and is not, and cost two rounds of chasing permissions. The
  relationship is `subscriptionVersion`, taking an id from `/v1/subscriptions/<id>/versions`
  (each product has one pending version, `PREPARE_FOR_SUBMISSION`):

  ```jsonc
  { "data": { "type": "reviewSubmissionItems", "relationships": {
      "reviewSubmission":    { "data": { "type": "reviewSubmissions",    "id": "<submission id>" } },
      "subscriptionVersion": { "data": { "type": "subscriptionVersions", "id": "<version id>" } } } } }
  ```
- **`store-subscriptions.mjs` has a submission side effect.** Writing group-level text creates a
  pending *subscription group version* that joins the open review submission **by itself**; the
  products do not follow. Submitting in that state fails with *"New subscription groups must be
  submitted with an auto-renewable subscription from within that group"* — a new group with nothing
  buyable in it. After any group-localization change on an unreleased group, add both product
  versions to the basket before submitting.
- **A REJECTED version is still editable — the tooling used to disagree.** Apple reopens a version
  for editing after App Review rejects it, which is exactly when corrected metadata has to go up.
  `--editable-check` originally accepted only `PREPARE_FOR_SUBMISSION`, so a rejection made the gate
  report "locked", skip the whole App Store leg, and finish **green** — a fix that looks published
  and is not. The editable set is now `PREPARE_FOR_SUBMISSION`, `REJECTED`, `DEVELOPER_REJECTED`,
  `METADATA_REJECTED`, `INVALID_BINARY`. Only in-review and live-with-no-open-version are locked.
- **App icons must have no alpha channel** (ITMS-90717) — rejected on channel presence, not
  transparency. Applies to every size in the appiconset, app and extension both.

## How to verify (never trust, always run)

```bash
# texts compile clean and within store limits
node e2e/store-metadata.mjs --check --root ../Vpnhood.App.Client

# what would a publish send vs. what was last published?
node e2e/store-publish-state.mjs --root ../Vpnhood.App.Client

# is the LIVE App Store listing exactly the repo content? (counts, checksums, order)
node e2e/store-asc-screenshots.mjs --bundle-id com.vpnhood.client.ios \
  --root ../Vpnhood.App.Client --keys-dir ../.user --check

# full pipeline, CI: dispatch and watch (vh-ref = the VpnHood ref the shipped app was built from,
# whose Avalonia UI draws the screens; webui-ref = the engine version)
gh workflow run publish_listing.yml -R vpnhood/Vpnhood.App.Client
gh workflow run update-screenshots.yml -R vpnhood/Vpnhood.App.Client -f vh-ref=develop -f webui-ref=develop

# CONNECT: same workflows, but the engine needs Connect's own config
node e2e/store-screenshots.mjs --project ../Vpnhood.App.Connect/store/project.mjs \
  --platform ios --locale en-US --only 1

# the Avalonia UI instead of the SPA (harness and asset store from the VpnHood checkout beside this repo)
node e2e/store-screenshots.mjs --renderer avalonia --platform android-phone --locale en-US
gh workflow run update-screenshots.yml -R vpnhood/Vpnhood.App.Connect -f vh-ref=develop -f webui-ref=develop
```

In CI (`update-screenshots.yml` in each store repo) the `generate` job checks out `vpnhood/VpnHood`
at `vh-ref` beside the engine and calls the composite action with `renderer: avalonia` and
`vh-root: .vh`; the action (`action.yml` at this repo's root) builds the harness there, syncs the
UI's asset store out of its own SPA build (`_sync-assets.ps1 -WebUiDir …`, under pwsh), and runs
the engine with `--harness`/`--assets` pointing into that checkout. A caller that leaves
`renderer` at its default still gets the SPA.

The Gemini key is the org secret `GOOGLE_GEMINI_TRNSLATE_APP_API_KEY` (one key for the SPA locales
and both store listings). Workflows hand it to the tool as `GEMINI_API_KEY`, which is what
vhtranslator reads — the two names differ on purpose. Locally it is
`.user/google_gemini_translate_app_api_key.txt`.

An unchanged listing must yield: gate green, both store jobs **skipped**, no record commit. A
forced run (`-f force=true`) must yield all jobs green with the App Store leg ~1 minute.

## Recipes

- **Add a locale**: add to `LOCALES` in `store/project.mjs` (with per-store overrides if the ASC
  code differs; `null` = store lacks it) and to `store-i18n/locales.json` + vhtranslator config in
  each store repo. Run update-screenshots.yml; vhtranslator fills the texts.
- **Change a screenshot page/order**: edit the `shots` arrays in `store/project.mjs` (array order
  IS store order). A page the Avalonia renderer has never shot needs its route in the harness's
  `PageRoutes.cs`. Regenerate; the listing publish syncs the delta.
- **Change store texts**: edit `store-i18n/en-US/store.json` in the store repo only; CI
  translates, compiles, commits; the gate picks up the change on the next listing publish.
- **Update release notes for a release**: edit the monorepo CHANGELOG's `# Latest` section
  (tags: `#client`/`#connect`, `#android #ios #windows #linux`, `#store` for Play's 500-char
  note — all trailing, per line), then run `update-release-notes.yml` in each store repo. iOS
  notes ship with the next listing publish; the Play note ships with the next release's AAB.
  When an app's FIRST App Store version goes live, flip `RELEASE_NOTES.ios` to `true` in its
  project config.
- **Add a store (e.g. Microsoft)**: new `_publish_listing_<store>.yml` module in main following
  the appstore/play pattern (optional credential → warn+skip; `published` output), a `STORES`
  entry in `store-publish-state.mjs`, a compiler section in `store-metadata.mjs`. fastlane has no
  MS support — use msstore CLI/StoreBroker; note MS couples packages+listing in one submission.

## Debugging a wedged App Store push

Do **not** blind-rerun or cancel first. `deliver`'s "Waiting for screenshots to appear …
error=Server error got 500" means the *post-upload verification poll* is failing — the uploads
themselves usually landed. Query the truth via the ASC API (see `--check` above): find sets with a
missing/stuck file, fix surgically (the sync tool does this), restore order, and only record the
publish after verification passes.
