import { VpnHoodApp } from '@/services/VpnHoodApp';
import { VpnProfileInfo, ConnectPlanId, ServerLocationOptions } from '@/services/VpnHood.Client.Api';
import router from '@/services/router';

export class ConnectManager {
  public static async showPromoteDialog(vpnProfileId: string, serverLocation: string, isPremium: boolean): Promise<boolean> {

    const vpnProfileInfo: VpnProfileInfo = await VpnHoodApp.instance.vpnProfileClient.get(vpnProfileId);
    const options: ServerLocationOptions | undefined = vpnProfileInfo.locationInfos.find(
      x => x.serverLocation === serverLocation)?.options;

    // For developer
    console.debug('Show Prompt: ' + options?.prompt);

    if (!options?.prompt)
      return false;

    // Show promotes dialog
    await router.push({
      name: 'PROMOTE_PREMIUM',
      query: {
        vpnProfileId,
        serverLocation,
        isPremiumLocation: String(isPremium),
      }
    });
    return true;
  }

  public static async connectWithCurrentProfile({isDiagnose = false}: {isDiagnose?: boolean} = {}): Promise<void> {
    const vpnProfileId = VpnHoodApp.instance.data.vpnProfileId;

    // For developer
    console.debug('connectWithCurrentProfile');
    console.debug(`VpnProfileId: ${vpnProfileId}`);

    if (!vpnProfileId) {
      await router.push({name: 'SERVERS'});
      return;
    }
    await this.connectWithProfile({vpnProfileId, isDiagnose});
  }

  public static async connectWithProfile({vpnProfileId, isDiagnose = false}: {vpnProfileId: string; isDiagnose?: boolean}): Promise<void> {
    const vpnProfileInfo: VpnProfileInfo = await VpnHoodApp.instance.vpnProfileClient.get(vpnProfileId);
    let serverLocation: string | null = vpnProfileInfo.selectedLocationInfo?.serverLocation ?? null;

    // For developer
    console.debug('connectWithProfile');
    console.debug('Detected server location: ' + serverLocation);

    if (!serverLocation && vpnProfileInfo.selectedLocationInfo) {
      await router.push({name: 'SERVERS'});
      return;
    }

    const hasPremium = vpnProfileInfo.selectedLocationInfo?.options.hasPremium;
    const hasFree = vpnProfileInfo.selectedLocationInfo?.options.hasFree;

    let isPremiumLocationSelected = vpnProfileInfo.isPremiumLocationSelected;

    if (hasPremium && !hasFree)
      isPremiumLocationSelected = true;

    if (!hasPremium && hasFree)
      isPremiumLocationSelected = false;

    // If the user is not premium and the selected location is premium, then set the location to auto to show the
    // promoted dialog with the option to connect as free.
    /*if (isPremiumLocationSelected && VpnHoodApp.instance.data.isPremiumSupported && !VpnHoodApp.instance.isPremiumAccount()){
      isPremiumLocationSelected = false;
      serverLocation = '*!/!*';
    }*/

    // Force the premium user to connect to the premium location.
    if (VpnHoodApp.instance.data.isPremiumUser && !isPremiumLocationSelected ){
      isPremiumLocationSelected = true;
      serverLocation = VpnHoodApp.instance.data.uiState.autoLocationValue;
    }

    await this.connectWithLocation({vpnProfileId, serverLocation, isPremiumLocation: isPremiumLocationSelected, isDiagnose});
  }

  public static async connectWithLocation({
    vpnProfileId,
    serverLocation,
    isPremiumLocation,
    isDiagnose,
    goToHome,
  }: {
    vpnProfileId: string;
    serverLocation: string | null;
    isPremiumLocation: boolean;
    isDiagnose?: boolean;
    goToHome?: boolean;
  }): Promise<void> {
    // For developer
    console.debug(`connectWithLocation: isPremiumLocation: ${isPremiumLocation}, goToHome: ${goToHome}`);

    if (serverLocation && await this.showPromoteDialog(vpnProfileId, serverLocation, isPremiumLocation))
      return;

    try {
      await VpnHoodApp.instance.connect({vpnProfileId, serverLocation, isPremium: isPremiumLocation, planId: ConnectPlanId.Normal, isDiagnose, goToHome});
    }
    catch{
      // Ignore message
    }

  }
}
