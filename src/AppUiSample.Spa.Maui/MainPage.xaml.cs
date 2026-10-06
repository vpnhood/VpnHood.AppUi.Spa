using VpnHood.AppLib.App;

namespace AppUiSample.Spa.Maui;

// The SPA in MAUI's own WebView: the page the app's local web host serves, at the address that also
// carries the API's token.
public partial class MainPage
{
    public MainPage()
    {
        InitializeComponent();
        MainWebView.Navigated += MainWebView_Navigated;
        _ = LoadPage();
    }

    private async Task LoadPage()
    {
        var localWebHost = VpnHoodApp.Instance.LocalWebHost ??
                           throw new InvalidOperationException("The app has no local web host.");
        var url = await localWebHost.EnsureStarted(CancellationToken.None);
        MainWebView.Source = url.AbsoluteUri;
    }

    private void MainWebView_Navigated(object? sender, WebNavigatedEventArgs e)
    {
        _ = HideSplashScreen();
    }

    private async Task HideSplashScreen()
    {
        await SplashScreen.FadeToAsync(0, 2000);
        MainLayout.Remove(SplashScreen);
    }

    protected override bool OnBackButtonPressed()
    {
        if (!MainWebView.CanGoBack)
            return base.OnBackButtonPressed();

        MainWebView.GoBack();
        return true;
    }
}
