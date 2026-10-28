- This repo is a sample: the products moved to the Avalonia UI in the main repo; the SPA lives in
  `src/VpnHood.AppUi.Presentation.Classic.Spa/` and the paths below are relative to it. Nothing here
  may reference the main repo's source - only its published packages (`Directory.Build.props` pins
  the version), or a local pack of them in `.packages` (README, "The one version pin").
- Don't use inline styles.
- Follow the existing code style.
- Localize all user-facing strings (i18n). The words are written and translated in the asset store,
  vpnhood/VpnHood.AppUi.Assets.Classic (the main repo's `src/AppUi/VpnHood.AppUi.Assets.Classic`; its
  README, "The words"): a new string goes in its `assets/locales/en.json`, is translated there into
  every language, and its `_copy-words-to-web-ui.ps1` copies the words here.
- Never edit `src/locales/*.json` or `src/content/`: they are that store's copy, and the next copy
  undoes an edit.
- Let global error handler handle errors (vhApp.processError).
- Do not use [id].vue filename for dynamic routes and customize route param name instead.
- Do not update the VpnHood.Client.Api.ts file manually, it is auto-generated: run
  `src/VpnHood.AppLib.Api.SwaggerHost/_recreate-api.ps1`.
- Assets loaded by name at run time are authored in `src/assets` (`src/locales` and `src/content` hold
  the store's copy of the words), copied verbatim into the bundle's `assets` folder and shared with the app's native (Avalonia) UI,
  which reads the same files — see "The assets folder" in build/assets-folder-plugin.ts before
  renaming, moving or importing one.
- The store tooling under `e2e/store/` and the root `action.yml` are called by other repos' workflows
  by ref and path; read `e2e/store/README.md` before changing their shape.
