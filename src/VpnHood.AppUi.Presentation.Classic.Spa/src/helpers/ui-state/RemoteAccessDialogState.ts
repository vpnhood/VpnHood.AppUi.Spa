import { RemoteAccessHint } from '@/helpers/UiConstants';

// Payload only. Whether the dialog is SHOWN lives in the route (ComponentName.RemoteAccessDialog),
// which is what makes the device's Back button close it instead of navigating the page out from
// under it - see VpnHoodApp.showRemoteAccessDialog.
export class RemoteAccessDialogState {
  public hint: RemoteAccessHint | null = null;
}
