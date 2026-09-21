using System.Windows;
using Microsoft.Extensions.Logging;
using VpnHood.AppLib;
using VpnHood.AppLib.Api.WebHost;
using VpnHood.AppLib.Win.Common;
using VpnHood.AppUi.Hosting.WebView.Windows;
using VpnHood.Core.Client.Abstractions;
using VpnHood.Core.Toolkit.Assets;
using VpnHood.Core.Toolkit.Logging;

namespace AppUiSample.WinSpa;

// A Windows head that shows the SPA: the app on the Windows device, and the web UI in a WebView2
// window, from the published packages alone. What the main repo's heads do with the Avalonia UI
// this does with a page - the same AppOptions, the same web host, another presentation.
public class App : Application
{
    private static AppOptions CreateAppOptions()
    {
        // The files this build placed beside the app, read the way this platform reads them: the
        // IP-location database from its package, the UI's store and the page from the SPA's build
        // (SpaAssets.targets). The app extracts the store once, for its web host, which serves the
        // same entries at /assets/ to the page.
        var platformAssets = new FolderAssetProvider(AppContext.BaseDirectory);

        return new AppOptions(appId: "com.vpnhood.sample.spa.windows", "VpnHoodSpaSample", isDebugMode: true) {
            AppName = "VpnHood! SPA Sample",
            CompanyName = "VpnHood",
            UiTheme = "blue",
            // the engine's own sample token, so the sample has a server profile and a location to show
            AccessKeys = [ClientOptions.SampleAccessKey],
            IsAddAccessKeySupported = true,
            PrivacyPolicyUrl = new Uri("https://www.vpnhood.com/vpnhood-client-privacy-policy"),
            TermsOfUseUrl = new Uri("https://www.vpnhood.com/legal/vpnhood-client-terms-of-use"),
            LogoAssetPath = "images/VpnHoodClient-logo.png",
            PrivacyConsentAssetName = "privacy-consent-client",
            IpLocationZipAsset = new Asset(platformAssets, "iplocations/IpLocations.zip"),
            UiZipAssets = [new Asset(platformAssets, "assets/ui.zip")],
            WebRootZipAsset = new Asset(platformAssets, "assets/web-root.zip"),
            WebHostFactory = new VpnHoodAppWebHostFactory()
        };
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // the web UI, in this application's window
        VpnHoodAppWpf.Init();
    }

    [STAThread]
    public static void Main(string[] args)
    {
        // what goes wrong before the app has a log of its own, said on the console
        VhLogger.Instance = VhLogger.CreateConsoleLogger();

        // the app first, on its own; then WPF, which hosts the page
        try {
            VpnHoodAppWin.Init(CreateAppOptions, args);
        }
        catch (Exception ex) {
            VhLogger.Instance.LogError(ex, "Could not run the app.");
            return;
        }

        new App().Run();
    }
}
