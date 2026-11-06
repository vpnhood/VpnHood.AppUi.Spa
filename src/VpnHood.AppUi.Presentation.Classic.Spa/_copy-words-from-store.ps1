# Takes this sample's copy of the words from the asset store, where they are written and translated
# (VpnHood.AppUi.Assets.Classic's README, "The words"): the locale files and the content documents.
#
#   src/locales/*.json  <- assets/locales/*.json, all but index.json - the store's list of its
#                          languages, which this build makes for itself
#   src/content/        <- assets/content/, every language's documents
#
# Both are mirrored (a file gone there is gone here); the other files in src/locales (i18n.ts) are
# left alone. The files are copied as bytes, so the copy is the store's exactly. Never edit it here,
# since the next copy undoes it.

param(
    # The asset store: in a VpnHood checkout beside this repo on a developer's machine.
    [string] $StoreDir = ""
)

$ErrorActionPreference = "Stop";

if ($StoreDir -eq "") {
    # <Vh>/VpnHood.AppUi.Spa/src/VpnHood.AppUi.Presentation.Classic.Spa -> <Vh>
    $vhFolder = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../.."));
    $StoreDir = Join-Path $vhFolder "VpnHood/src/AppUi/VpnHood.AppUi.Assets.Classic";
}
$localesDir = Join-Path $StoreDir "assets/locales";
$contentDir = Join-Path $StoreDir "assets/content";
$webLocalesDir = Join-Path $PSScriptRoot "src/locales";
$webContentDir = Join-Path $PSScriptRoot "src/content";

if (!(Test-Path (Join-Path $localesDir "en.json"))) { throw "The asset store has no words there. $localesDir"; }

# ---- the words: one file per language ----
$localeFiles = @(Get-ChildItem $localesDir -Filter "*.json" | Where-Object { $_.Name -ne "index.json" });
Get-ChildItem $webLocalesDir -Filter "*.json" | Remove-Item -Force;
foreach ($file in $localeFiles) { Copy-Item $file.FullName $webLocalesDir; }
Write-Host "Copied $($localeFiles.Count) locale files to $webLocalesDir.";

# ---- the documents: a folder per language ----
if (Test-Path $webContentDir) { Remove-Item $webContentDir -Recurse -Force; }
Copy-Item $contentDir $webContentDir -Recurse;
Write-Host "Copied $(@(Get-ChildItem $webContentDir -Recurse -File).Count) documents to $webContentDir.";
