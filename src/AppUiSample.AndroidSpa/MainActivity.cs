using Android.Content;
using VpnHood.AppLib.Droid.Common.Activities;
using VpnHood.AppLib.Droid.Common.Constants;
using VpnHood.AppUi.Hosting.WebView.Droid;

namespace AppUiSample.AndroidSpa;

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
public class MainActivity : AndroidAppMainActivity
{
    // the web view, over the shared host that starts the web server and loads the page into it
    protected override AndroidAppMainActivityHandler CreateMainActivityHandler()
    {
        return new AndroidWebViewMainActivityHandler(this, new AndroidWebViewMainActivityOptions());
    }
}
