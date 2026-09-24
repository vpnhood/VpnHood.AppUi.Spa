using Android.Runtime;
using VpnHood.AppLib.Api.WebHost;
using VpnHood.AppLib.App;
using VpnHood.AppLib.App.Android;
using VpnHood.AppLib.App.Android.Constants;
using VpnHood.Core.Client.Abstractions;
using VpnHood.Net.Toolkit.Assets;

namespace AppUiSample.Spa.Android;

// An Android head that shows the SPA: the app on the Android device, and the web UI in the system
// WebView, from the published packages alone. What the main repo's heads do with the Avalonia UI
// this does with a page - the same AppOptions, the same web host, another presentation.
[Application(
    Label = AndroidAppConstants.Label,
    Icon = AndroidAppConstants.Icon,
    Banner = AndroidAppConstants.Banner,
    NetworkSecurityConfig = AndroidAppConstants.NetworkSecurityConfig,
    SupportsRtl = AndroidAppConstants.SupportsRtl,
    AllowBackup = AndroidAppConstants.AllowBackup)]
public class App(IntPtr javaReference, JniHandleOwnership transfer)
    : Application(javaReference, transfer)
{
    private AppOptions CreateAppOptions()
    {
        // The files this build packed into the APK, read the way this platform reads them: the
        // IP-location database from its package, the UI's store and the page from the SPA's build
        // (SpaAssets.targets). The app extracts the store once, for its web host, which serves the
        // same entries at /assets/ to the page.
        var platformAssets = new AndroidAssetProvider(Application.Context);
        var appId = PackageName ?? throw new InvalidOperationException("The application has no package name.");

        return new AppOptions(appId, "VpnHoodSpaSample", isDebugMode: true) {
            AppName = "VpnHood! SPA Sample",
            CompanyName = "VpnHood",
            UiTheme = "blue",
            // the engine's own sample token, so the sample has a server profile and a location to show
            AccessKeys = [ClientOptions.SampleAccessKey],
            IsAddAccessKeySupported = true,
            AdjustForSystemBars = false,
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

    public override void OnCreate()
    {
        VpnHoodAndroidApp.Init(CreateAppOptions);
        base.OnCreate();
    }

    public override void OnTerminate()
    {
        if (VpnHoodAndroidApp.IsInit)
            VpnHoodAndroidApp.Instance.Dispose();

        base.OnTerminate();
    }
}
