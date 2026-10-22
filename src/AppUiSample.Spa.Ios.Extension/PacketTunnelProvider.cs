using ObjCRuntime;
using VpnHood.Core.Client.Devices.Ios;

namespace AppUiSample.Spa.Ios.Extension;

// What iOS starts in the extension: the class Info.plist names (NSExtensionPrincipalClass). It lives in
// this assembly rather than in the package's, because the runtime registers only the classes of the
// assemblies it loads, and deriving from the VpnHood tunnel here is what loads that one.
[Register("PacketTunnelProvider")]
public class PacketTunnelProvider : IosVpnService
{
    // The runtime calls this when iOS creates the class.
    protected PacketTunnelProvider(NativeHandle handle) : base(handle)
    {
    }
}
