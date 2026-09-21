$curDir = $PSScriptRoot;

# variables
$projectFile="$curDir/VpnHood.AppLib.Api.SwaggerHost.csproj";
$namespace = "VpnHood.Client.Api";
$nswagFile = "$curDir/Api/Api.nswag";
$outBaseFile = "VpnHood.Client.Api";
$noBuild = $false;

# calculated
$outputFile = "$curDir/Api/$outBaseFile.ts";

# run; nswag is a local dotnet tool, so it must run from the manifest root (./.config)
$variables="/variables:namespace=$namespace,apiBaseFile=$outBaseFile,projectFile=$projectFile,nobuid=$noBuild";
Push-Location $curDir;
try {
	dotnet tool restore;
	if ($LASTEXITCODE -ne 0) { throw "dotnet tool restore failed."; }
	dotnet tool run nswag run $nswagFile $variables;
	if ($LASTEXITCODE -ne 0) { throw "nswag generation failed."; }
}
finally {
	Pop-Location;
}

# the SPA beside this host is the one consumer of the client
$uiProjectTarget = Join-Path $PSScriptRoot "..\VpnHood.AppUi.Presentation.Classic.Spa\src\services\VpnHood.Client.Api.ts";
if (Test-Path $uiProjectTarget) {
	Copy-Item $outputFile $uiProjectTarget -Force;
	Write-Host "Output has been copied to the SPA. $uiProjectTarget";
}
else {
	Write-Host "Could not update the SPA. $uiProjectTarget" -ForegroundColor Yellow;
}
