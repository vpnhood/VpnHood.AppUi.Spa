using Microsoft.AspNetCore.Mvc;
using VpnHood.AppLib.Api;
using VpnHood.AppLib.Api.SwaggerHost.Exceptions;
using VpnHood.AppLib.Api.VpnProfiles;
using VpnHood.AppLib.Api.Premium;

namespace VpnHood.AppLib.Api.SwaggerHost.Controllers;

[ApiController]
[Route("api/vpn-profiles")]
public class VpnProfileController : ControllerBase, IVpnProfilesApi
{
    [HttpPut("access-keys")]
    public Task<VpnProfileInfo> AddByAccessKey(string accessKey, CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }

    [HttpGet("{vpnProfileId}")]
    public Task<VpnProfileInfo> Get(Guid vpnProfileId, CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }

    [HttpGet("{vpnProfileId}/access-code")]
    public Task<string> GetAccessCode(Guid vpnProfileId, CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }

    [HttpPatch("{vpnProfileId}")]
    public Task<VpnProfileInfo> Update(Guid vpnProfileId, VpnProfileUpdateParams updateParams,
        CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }

    [HttpDelete("{vpnProfileId}")]
    public Task Delete(Guid vpnProfileId, CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }

    [HttpGet("{vpnProfileId}/purchase-options")]
    public Task<AppPurchaseOptions> GetPurchaseOptions(Guid vpnProfileId, CancellationToken cancellationToken)
    {
        throw new SwaggerOnlyException();
    }
}