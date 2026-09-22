# VpnHood.AppUi.Spa

> [!IMPORTANT]
> **A demonstration, not a recommendation.** It shows that the VpnHood engine carries whatever UI
> stack a head brings - a hybrid SPA as readily as a native one. The web UI itself has
> compatibility trouble on some older devices and has nowhere to run on tvOS, which is why the
> products moved to Avalonia.

The VpnHood app's web UI, kept as a **sample**. The products moved to the Avalonia UI in the main
repo (`VpnHood.AppUi.Presentation.Classic.Avalonia`); this repo proves the other direction still
works: a head built from the published VpnHood packages alone, showing a single-page web app as its
UI. Nothing here references the main repo's source - what the samples get from NuGet is what any
head outside that repo gets, so swapping the presentation is a matter of which package a head
references and which page it places beside itself.

## What is here

| Folder | What it is |
| --- | --- |
| `src/VpnHood.AppUi.Presentation.Classic.Spa/` | the UI: Vue 3, Vite, Vuetify. The files both UIs load by name at run time - images, flags, fonts, the words of every language, the content documents - are authored in its `src/assets`, `src/locales` and `src/content`; the main repo's `_sync-assets.ps1` takes them from this build. |
| `src/VpnHood.AppLib.Api.SwaggerHost/` | poses the app API (`VpnHood.AppLib.Api`, from NuGet) to NSwag; its `_recreate-api.ps1` regenerates the SPA's TypeScript client. Never run in an app: every action throws. |
| `src/AppUiSample.Spa.Windows/` | a Windows head: the SPA in a WebView2 window, over `VpnHood.AppUi.Hosting.WebView.Windows`. |
| `src/AppUiSample.Spa.Android/` | an Android head: the SPA in the system WebView, over `VpnHood.AppUi.Hosting.WebView.Android`. |
| `src/SpaAssets.targets` | what both samples import: zips the SPA's `dist` into the two files a head places beside itself. |
| `action.yml`, `…/e2e/store/` | the store screenshot and listing tooling that the store repos (`Vpnhood.App.Client`, `Vpnhood.App.Connect`) and the main repo's `publish_listing.yml` call by ref. Read `e2e/store/README.md` before touching any of it. |

## Running a sample

1. Build the SPA: `npm ci` then `npm run build` in `src/VpnHood.AppUi.Presentation.Classic.Spa`.
2. `dotnet build VpnHood.AppUi.Spa.slnx`, or open the solution and run `AppUiSample.Spa.Windows`.

Each sample's build zips the SPA's `dist` into `assets/ui.zip` - the store, which the app extracts
once and its web host serves at `/assets/` - and `assets/web-root.zip`, the page. The IP-location
database arrives the same way from `VpnHood.Core.IpLocations.Assets.Ip2LocationLite`. Nothing is
copied by hand, and the samples never read the SPA's source.

The Windows sample needs the Edge WebView2 runtime, which Windows 11 has. Connecting needs elevation;
the UI itself does not.

## Developing the SPA

`npm run dev` serves it at `http://localhost:8080`, with the assets from `src/`. Point
`VITE_API_BASE_URL` in `.env.development` at a running app's API: a sample here serves its at
`http://127.0.0.1:9090` (IPv4 - `localhost` resolves to `::1` first, where nothing listens), and
every debug head of the main repo serves one too.

After a change to the C# API, run `src/VpnHood.AppLib.Api.SwaggerHost/_recreate-api.ps1`; never edit
`src/services/VpnHood.Client.Api.ts` by hand. Edit only `src/locales/en.json`; the translator writes
every other locale at publish time.

## The one version pin

`Directory.Build.props` holds `VhPackageVersion`, the version of the VpnHood packages every project
here consumes. Move it when the packages move; nothing else pins them.
