import { VpnHoodApp } from '@/services/VpnHoodApp';
import { ClientProfileInfo, ConnectPlanId, ServerLocationOptions } from '@/services/VpnHood.Client.Api';
import router from '@/services/router';

export class ConnectManager {
  public static async showPromoteDialog(clientProfileId: string, serverLocation: string, isPremium: boolean): Promise<boolean> {

    const clientProfileInfo: ClientProfileInfo = await VpnHoodApp.instance.clientProfileClient.get(clientProfileId);
    const options: ServerLocationOptions | undefined = clientProfileInfo.locationInfos.find(
      x => x.serverLocation === serverLocation)?.options;

    // For developer
    console.debug('Show Prompt: ' + options?.prompt);

    if (!options?.prompt)
      return false;

    // Show promotes dialog
    await router.push({
      name: 'PROMOTE_PREMIUM',
      query: {
        clientProfileId,
        serverLocation,
        isPremiumLocation: String(isPremium),
      }
    });
    return true;
  }

  public static async connectWithCurrentProfile({isDiagnose = false}: {isDiagnose?: boolean} = {}): Promise<void> {
    const clientProfileId = VpnHoodApp.instance.data.clientProfileId;

    // For developer
    console.debug('connectWithCurrentProfile');
    console.debug(`ClientProfileId: ${clientProfileId}`);

    if (!clientProfileId) {
      await router.push({name: 'SERVERS'});
      return;
    }
    await this.connectWithProfile({clientProfileId, isDiagnose});
  }

  public static async connectWithProfile({clientProfileId, isDiagnose = false}: {clientProfileId: string; isDiagnose?: boolean}): Promise<void> {
    const clientProfileInfo: ClientProfileInfo = await VpnHoodApp.instance.clientProfileClient.get(clientProfileId);
    let serverLocation: string | null = clientProfileInfo.selectedLocationInfo?.serverLocation ?? null;

    // For developer
    console.debug('connectWithProfile');
    console.debug('Detected server location: ' + serverLocation);

    if (!serverLocation && clientProfileInfo.selectedLocationInfo) {
      await router.push({name: 'SERVERS'});
      return;
    }

    const hasPremium = clientProfileInfo.selectedLocationInfo?.options.hasPremium;
    const hasFree = clientProfileInfo.selectedLocationInfo?.options.hasFree;

    let isPremiumLocationSelected = clientProfileInfo.isPremiumLocationSelected;

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

    await this.connectWithLocation({clientProfileId, serverLocation, isPremiumLocation: isPremiumLocationSelected, isDiagnose});
  }

  public static async connectWithLocation({
    clientProfileId,
    serverLocation,
    isPremiumLocation,
    isDiagnose,
    goToHome,
  }: {
    clientProfileId: string;
    serverLocation: string | null;
    isPremiumLocation: boolean;
    isDiagnose?: boolean;
    goToHome?: boolean;
  }): Promise<void> {
    // For developer
    console.debug(`connectWithLocation: isPremiumLocation: ${isPremiumLocation}, goToHome: ${goToHome}`);

    if (serverLocation && await this.showPromoteDialog(clientProfileId, serverLocation, isPremiumLocation))
      return;

    try {
      await VpnHoodApp.instance.connect({clientProfileId, serverLocation, isPremium: isPremiumLocation, planId: ConnectPlanId.Normal, isDiagnose, goToHome});
    }
    catch{
      // Ignore message
    }

  }
}
