using VpnHood.Core.Client.Devices.WindowsTun;

namespace AppUiSample.Spa.Windows.VpnHost;

// The VPN service's own process, which the app's service starts at each connect. It carries nothing
// of the app or its UI: all of it is WindowsVpnHost.Run.
internal static class Program
{
    private static Task<int> Main(string[] args)
    {
        return WindowsVpnHost.Run(args);
    }
}
