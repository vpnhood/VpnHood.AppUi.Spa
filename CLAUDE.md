- This repo is a sample: the products moved to the Avalonia UI in the main repo; the SPA lives in
  `src/VpnHood.AppUi.Presentation.Classic.Spa/` and the paths below are relative to it. Nothing here
  may reference the main repo's source - only its published packages (`Directory.Build.props` pins
  the version), or a local pack of them in `.packages` (README, "The one version pin").
- Don't use inline styles.
- Follow the existing code style.
- Localize all user-facing strings in en.json (i18n).
- Don't add any item in i18n files except en.json.
- Never run the translator (vh_translator); it is run at publish time.
- Let global error handler handle errors (vhApp.processError).
- Do not use [id].vue filename for dynamic routes and customize route param name instead.
- Do not update the VpnHood.Client.Api.ts file manually, it is auto-generated: run
  `src/VpnHood.AppLib.Api.SwaggerHost/_recreate-api.ps1`.
- Assets loaded by name at run time are authored in `src/assets` (plus `src/locales`, `src/content`),
  copied verbatim into the bundle's `assets` folder and shared with the app's native (Avalonia) UI,
  which reads the same files — see "The assets folder" in build/assets-folder-plugin.ts before
  renaming, moving or importing one.
- The store tooling under `e2e/store/` and the root `action.yml` are called by other repos' workflows
  by ref and path; read `e2e/store/README.md` before changing their shape.
