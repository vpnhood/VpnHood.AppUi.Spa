using Foundation;
using VpnHood.AppLib.Api.App;
using VpnHood.AppLib.Api.WebHost;
using VpnHood.AppLib.App;
using VpnHood.AppLib.App.Ios;
using VpnHood.AppUi.Hosting.WebView.Ios;
using VpnHood.Core.Client.Abstractions;
using VpnHood.Net.Toolkit.Assets;

namespace AppUiSample.Spa.Ios;

// An iOS head that shows the SPA: the app on the iOS device, and the web UI in a WKWebView, from the
// published packages alone. What the main repo's heads do with the Avalonia UI this does with a page -
// the same AppOptions, the same web host, another presentation. The tunnel runs in the network
// extension beside it (AppUiSample.Spa.Ios.Extension).
[Register("AppDelegate")]
public class AppDelegate : IosWebViewAppDelegate
{
    // The build's, as in the main repo's heads: a debug app asks no token of its local API and keeps
    // its LAN listener open without a pairing, which a release must not.
#if DEBUG
    private const bool IsDebugMode = true;
#else
    private const bool IsDebugMode = false;
#endif

    // The platform builds the device from the App Group and the extension's bundle id.
    protected override IosInitParams CreateInitParams()
    {
        return new IosInitParams {
            AppId = NSBundle.MainBundle.BundleIdentifier
                    ?? throw new InvalidOperationException("The app's bundle has no identifier."),
            AppName = "VpnHood! SPA Sample",
            AppVersion = typeof(AppDelegate).Assembly.GetName().Version
                         ?? throw new InvalidOperationException("The sample's assembly has no version."),
            StorageFolderName = "VpnHoodSpaSample",
            // the group both Entitlements.plist files name, and the extension's ApplicationId
            AppGroupId = "group.com.vpnhood.sample.spa.ios",
            ProviderBundleId = "com.vpnhood.sample.spa.ios.networkextension",
            AppOptionsFactory = CreateAppOptions
        };
    }

    private static AppOptions CreateAppOptions(AppOptionsContext context)
    {
        // The files this build placed in the app bundle: the IP-location database from its package, the
        // UI's store and the page from the SPA's build (SpaAssets.targets). The app extracts the store
        // once, for its web host, which serves the same entries at /assets/ to the page.
        var assets = context.PackagedAssetProvider;

        return new AppOptions(context, IsDebugMode) {
            PackageTitle = "VpnHoodSpaSample",
            CompanyName = "VpnHood",
            UiTheme = "blue",
            // the engine's own sample token, so the sample has a server profile and a location to show
            AccessKeys = [ClientOptions.SampleAccessKey],
            IsAddAccessKeySupported = true,
            Links = new AppLinks {
                PrivacyPolicy = new Uri("https://www.vpnhood.com/legal/vpnhood-client/privacy-policy/"),
                TermsOfUse = new Uri("https://www.vpnhood.com/legal/vpnhood-client/terms-of-use/")
            },
            LogoAssetPath = "images/logo-client.png",
            PrivacyConsentAssetName = "privacy-consent-client",
            IpLocationZipAsset = new Asset(assets, "iplocations/IpLocations.zip"),
            UiZipAssets = [new Asset(assets, "assets/ui.zip")],
            WebRootZipAsset = new Asset(assets, "assets/web-root.zip"),
            WebHostFactory = new VpnHoodAppWebHostFactory()
        };
    }
}
