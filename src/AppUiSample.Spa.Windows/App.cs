using VpnHood.AppLib.Api.WebHost;
using VpnHood.AppLib.App;
using VpnHood.AppUi.Hosting.Desktop;
using VpnHood.AppUi.Hosting.Desktop.Windows;
using VpnHood.AppUi.Hosting.WebView.Windows;
using VpnHood.Core.Client.Abstractions;
using VpnHood.Net.Toolkit.Assets;

namespace AppUiSample.Spa.Windows;

// A Windows head that shows the SPA: the app on the Windows device, and the web UI in a WebView2
// window, from the published packages alone. What the main repo's heads do with the Avalonia UI
// this does with a page - the same host, the same AppOptions, the same web host, another
// presentation. `dev` runs the app and the window in one process, with no service to install.
internal static class App
{
    // the one answer the host and the options must give alike (DesktopInitParams.IsAddAccessKeySupported)
    private const bool IsAddAccessKeySupported = true;

    // The build's, as in the main repo's heads: a debug app asks no token of its local API and keeps
    // its LAN listener open without a pairing, which a release must not.
#if DEBUG
    private const bool IsDebugMode = true;
#else
    private const bool IsDebugMode = false;
#endif

    [STAThread]
    private static int Main(string[] args)
    {
        return WindowsDesktopHost.Run(args, new DesktopInitParams {
            AppId = "com.vpnhood.sample.spa.windows",
            AppName = "VpnHood! SPA Sample",
            AppOptionsFactory = CreateAppOptions,
            IsAddAccessKeySupported = IsAddAccessKeySupported,
            Ui = new WindowsWebViewUi()
        });
    }

    private static AppOptions CreateAppOptions(AppOptionsContext context)
    {
        // The files this build placed beside the app: the IP-location database from its package, the
        // UI's store and the page from the SPA's build (SpaAssets.targets). The app extracts the store
        // once, for its web host, which serves the same entries at /assets/ to the page.
        var assets = context.PackagedAssetProvider;

        return new AppOptions(context, IsDebugMode) {
            PackageTitle = "VpnHoodSpaSample",
            CompanyName = "VpnHood",
            UiTheme = "blue",
            // the engine's own sample token, so the sample has a server profile and a location to show
            AccessKeys = [ClientOptions.SampleAccessKey],
            IsAddAccessKeySupported = IsAddAccessKeySupported,
            PrivacyPolicyUrl = new Uri("https://www.vpnhood.com/vpnhood-client-privacy-policy"),
            TermsOfUseUrl = new Uri("https://www.vpnhood.com/legal/vpnhood-client-terms-of-use"),
            LogoAssetPath = "images/logo-client.png",
            PrivacyConsentAssetName = "privacy-consent-client",
            IpLocationZipAsset = new Asset(assets, "iplocations/IpLocations.zip"),
            UiZipAssets = [new Asset(assets, "assets/ui.zip")],
            WebRootZipAsset = new Asset(assets, "assets/web-root.zip"),
            WebHostFactory = new VpnHoodAppWebHostFactory()
        };
    }
}
