using Microsoft.Extensions.Logging;
using VpnHood.AppLib.Api.WebHost;
using VpnHood.AppLib.App;
using VpnHood.AppUi.Hosting.Maui;
using VpnHood.Core.Client.Abstractions;
using VpnHood.Net.Toolkit.Assets;

namespace AppUiSample.Spa.Maui;

// A MAUI head that shows the SPA: the app in this process, on Android and on Windows, and the web UI
// in MAUI's own WebView (MainPage), from the published packages alone. What the main repo's heads do
// with the Avalonia UI this does with a page - the same AppOptions, the same web host.
public static class MauiProgram
{
    // The build's, as in the main repo's heads: a debug app asks no token of its local API and keeps
    // its LAN listener open without a pairing, which a release must not.
#if DEBUG
    private const bool IsDebugMode = true;
#else
    private const bool IsDebugMode = false;
#endif

    private static AppInitParams CreateInitParams()
    {
        return new AppInitParams
        {
            AppId = "com.vpnhood.sample.spa.maui",
            AppName = "VpnHood! SPA Sample",
            StorageFolderName = "VpnHoodSpaMauiSample",
            AppOptionsFactory = CreateAppOptions
        };
    }

    private static AppOptions CreateAppOptions(AppOptionsContext context)
    {
        // The files this build placed beside the app: the IP-location database from its package, the
        // UI's store and the page from the SPA's build (SpaAssets.targets). The app extracts the store
        // once, for its web host, which serves the same entries at /assets/ to the page.
        var assets = context.PackagedAssetProvider;

        return new AppOptions(context, IsDebugMode)
        {
            PackageTitle = "VpnHoodSpaMauiSample",
            CompanyName = "VpnHood",
            UiTheme = "blue",
            // the engine's own sample token, so the sample has a server profile and a location to show
            AccessKeys = [ClientOptions.SampleAccessKey],
            IsAddAccessKeySupported = true,
            PrivacyPolicyUrl = new Uri("https://www.vpnhood.com/vpnhood-client-privacy-policy"),
            TermsOfUseUrl = new Uri("https://www.vpnhood.com/legal/vpnhood-client-terms-of-use"),
            LogoAssetPath = "images/logo-client.png",
            PrivacyConsentAssetName = "privacy-consent-client",
            IpLocationZipAsset = new Asset(assets, "iplocations/IpLocations.zip"),
            UiZipAssets = new IAsset[] { new Asset(assets, "assets/ui.zip") },
            WebRootZipAsset = new Asset(assets, "assets/web-root.zip"),
            WebHostFactory = new VpnHoodAppWebHostFactory()
        };
    }

    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // the app, started once in this process from the same init params as every head
        VpnHoodAppMaui.Init(CreateInitParams());

        if (IsDebugMode)
            builder.Logging.AddDebug();

        return builder.Build();
    }
}
