// The words only: whether the dialog is open lives in the route, like every other dialog's
// (VpnHoodApp.confirmDialogModel), so that Back closes it instead of moving the page under it.
export class ConfirmDialogState {
  public title: string = "";
  public message: string = "";
}
