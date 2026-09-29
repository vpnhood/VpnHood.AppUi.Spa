using Android.Content;
using VpnHood.AppLib.App.Android.Constants;
using VpnHood.AppUi.Hosting.WebView.Android;

namespace AppUiSample.Spa.Android;

// The launcher, and the page in the system WebView: all of it the web view UI's activity.
[Activity(
    MainLauncher = true,
    Label = AndroidMainActivityConstants.Label,
    Theme = AndroidMainActivityConstants.Theme,
    LaunchMode = AndroidMainActivityConstants.LaunchMode,
    Exported = AndroidMainActivityConstants.Exported,
    WindowSoftInputMode = AndroidMainActivityConstants.WindowSoftInputMode,
    ScreenOrientation = AndroidMainActivityConstants.ScreenOrientation,
    ConfigurationChanges = AndroidMainActivityConstants.ConfigChanges)]
[IntentFilter([Intent.ActionMain], Categories = [Intent.CategoryLauncher, Intent.CategoryLeanbackLauncher])]
public class MainActivity : AndroidWebViewMainActivity
{
}
