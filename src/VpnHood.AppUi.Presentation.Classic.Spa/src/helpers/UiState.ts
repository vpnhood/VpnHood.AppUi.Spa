import { ErrorDialogState } from '@/helpers/ui-state/ErrorDialogState';
import { GeneralSnackbarState } from '@/helpers/ui-state/GeneralSnackbarState';
import { ConfirmDialogState } from '@/helpers/ui-state/ConfirmDialogState';
import { OpenOnPhoneDialogState } from '@/helpers/ui-state/OpenOnPhoneDialogState';
import { RemoteAccessDialogState } from '@/helpers/ui-state/RemoteAccessDialogState';

export class UiState {

  public errorDialogState: ErrorDialogState = new ErrorDialogState();
  public generalSnackbarState: GeneralSnackbarState = new GeneralSnackbarState();
  public confirmDialogState: ConfirmDialogState = new ConfirmDialogState();
  public openOnPhoneDialogState: OpenOnPhoneDialogState = new OpenOnPhoneDialogState();
  public remoteAccessDialogState: RemoteAccessDialogState = new RemoteAccessDialogState();

  // Suppress message state
  public userIgnoreSuppressToTime: Date | null = null;

  // Update message state
  public showUpdateSnackbar: boolean = false;

  // Keyring plan §5.1: the save-code-to-account prompt is offered at most once per app session

  // Time of user ignored the last error message
  public configTime: Date = new Date();

  public showLoadingDialog: boolean = false;

  // A flow whose UI is on the TV while this browser waits for it - VpnHoodApp.withContinueOnTv.
  public showContinueOnTvDialog: boolean = false;

  // Mirrors "VpnHoodApp.vhFirebase is available" for the templates. The app instance itself is
  // deliberately non-reactive (see VpnHoodAppData's header note), so a template cannot watch that
  // field directly, and it now changes at runtime as the user grants/withdraws analytics consent.
  public isReportSendingAvailable: boolean = false;

  public stateLastErrorMessage: string | null = null;

  public uiConnectInProgress: boolean = false;
  public uiDisconnectInProgress: boolean = false;

  public edgeToEdgeTop: number | null = null;
  public edgeToEdgeBottom: number | null = null;

  // Bottom edge of the current page's header, as an offset from v-main — see PageHeaderAnchor.
  // Null until the first header with an anchor has been laid out.
  public pageHeaderBottom: number | null = null;

  public isShowDeveloperDialog: boolean = false;

  public maxWidthOnLargeScreen = "959px";
  public autoLocationValue = null;
  public allCountriesCount = 238;
}
