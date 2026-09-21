// Payload only. Whether the dialog is SHOWN lives in the route (ComponentName.OpenOnPhoneDialog),
// which is what makes the device's Back button close it instead of navigating the page out from
// under it - see VpnHoodApp.onExternalLinkClick.
export class OpenOnPhoneDialogState {
  public title: string = "";
  public url: string = "";
}
