using VpnHood.AppUi.Hosting.Maui;

namespace AppUiSample.Spa.Maui;

public partial class App
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        // a phone's shape where the app has a window of its own size
        var window = new Window(new MainPage())
        {
            Width = 400,
            Height = 700,
            Title = "VpnHood! SPA Sample"
        };
        return window;
    }

    protected override void CleanUp()
    {
        base.CleanUp();
        if (VpnHoodAppMaui.IsInit) VpnHoodAppMaui.Instance.Dispose();
    }
}
