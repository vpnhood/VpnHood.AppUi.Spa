import { ApiException, AppFeature, ExceptionType, SessionErrorCode } from '@/services/VpnHood.Client.Api';
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { AnalyticsCustomEvent } from '@/helpers/UiConstants';
import router from '@/services/router';
import { Util } from './Util';

export interface ShowErrorActions {
  showDiagnose?: boolean,
  showChangeServerToAuto?: boolean,
  showAccessCodeActions?: boolean,
  showChangeAccessCode?: boolean,
  isPrivateDnsError?: boolean,
  showTryPremium?: boolean
}

interface ShowErrorOptions {
  ignoreMessage?: boolean,
  localeKey?: string,
  text?: string,
  action?: ShowErrorActions
}

export class ErrorHandler {
  
  public static async processError(err: unknown): Promise<void> {

    const errorOptions: ShowErrorOptions = await this.getErrorMessage(err);

    // Do not show any message
    if (errorOptions.ignoreMessage) {
      // do not clear last message when ignored, just do not show it
      return;
    }

    const text = errorOptions.text ?? '';

    // English message for analytics
    const englishErrorMessage = errorOptions.localeKey ?
      (i18n.global.t(errorOptions.localeKey, 1, { locale: 'en' }) + text) :
      text;

    // Translated message for show to user
    const userErrorMessage = errorOptions.localeKey ?
      (i18n.global.t(errorOptions.localeKey) + text) :
      text;

    // Send the error message to analytics
    VpnHoodApp.instance.vhFirebase?.analyticsLogEvent(AnalyticsCustomEvent.AlertDialogEventName, {
      message: englishErrorMessage,
      ui_language: i18n.global.locale.value,
      org_message: err,
      app_version: VpnHoodApp.instance.getAppVersion(true)
    });

    // Private DNS error
    if (errorOptions.action?.isPrivateDnsError && VpnHoodApp.instance.data.isPremiumFeature(AppFeature.CustomDns)) {
      await router.push({ name: 'ERROR_PRIVATE_DNS' });
      await VpnHoodApp.instance.clearLastError();
      return;
    }

    // Show the message
    await VpnHoodApp.instance.showErrorMessage(userErrorMessage, errorOptions.action);
  }

  private static async getErrorMessage(err: unknown): Promise<ShowErrorOptions> {
    if (typeof err === 'string')
      return { text: err };

    //All exception from API
    if (err instanceof ApiException)
      return this.processApiException(err);

    if (err instanceof Error)
      return { text: err.message ?? err };

    return { localeKey: `UNKNOWN_ERROR: ${err}` };
  }

  private static async processApiException(err: ApiException): Promise<ShowErrorOptions> {
    // For developer
    console.log('Exception', err);

    switch (err.exceptionTypeName) {

      // Intentionally silenced errors
      //case 'OperationCanceledException':
      case ExceptionType.UserCanceled:
        //case 'ObjectDisposedException':
        return { ignoreMessage: true };

      // Could not connect to any server (premium cannot solve this)
      case ExceptionType.UnreachableServer:
        return { localeKey: 'UNREACHABLE_SERVER_MESSAGE', action: { showDiagnose: true } };

      case ExceptionType.UnreachableServerLocation:
        // disanose does not offer any help
        if (VpnHoodApp.instance.data.state.hasDiagnoseRequested)
          return { localeKey: 'UNREACHABLE_SERVER_LOCATION_MESSAGE' };

        //  Could not connect to any server in the selected location
        // it same for premium and free users
        if (!Util.toBoolean(err.data?.IsAutoLocation))
          return {
            localeKey: 'UNREACHABLE_SERVER_LOCATION_MESSAGE_WITH_CHANGE_TO_AUTO',
            action: { showChangeServerToAuto: true }
          }

        // prompt for premium if applicable on current profile
        if (!VpnHoodApp.instance.data.isPremiumUser && VpnHoodApp.instance.data.canTryPremium) {
          return {
            localeKey: 'UNREACHABLE_SERVER_LOCATION_MESSAGE_WITH_TRY_PREMIUM',
            action: { showTryPremium: true }
          };
        }

        // Generic unreachable server message
        return { localeKey: 'UNREACHABLE_SERVER_LOCATION_MESSAGE', action: { showDiagnose: true } };

      case ExceptionType.RequestQuickLaunch:
        return { localeKey: 'QUICK_LAUNCH_TURN_ON_ERROR' };

      // No internet or slow
      case ExceptionType.NoInternet:
        return { localeKey: 'NO_INTERNET_MSG', action: { showDiagnose: true } };

      // App minimized during showing ad
      case ExceptionType.ShowAdNoUi:
        return { localeKey: 'SHOW_AD_NO_UI_MSG' };

      // VPN service encountered an issue
      case ExceptionType.VpnServiceUnreachable:
        return { localeKey: 'VPN_SERVICE_UNREACHABLE_MSG' };

      // It is not clear under what circumstances this occurs.
      case ExceptionType.VpnServiceTimeout:
        return { localeKey: 'VPN_SERVICE_TIMEOUT_MSG' };

      // It is not clear under what circumstances this occurs.
      case ExceptionType.VpnServiceNotReady:
        return { localeKey: 'VPN_SERVICE_NOT_READY_MSG' };

      case ExceptionType.NoStableVpn:
        return { localeKey: 'NO_STABLE_VPN_MSG' };

      // User sees the rewarded ad but does not earn
      case ExceptionType.RewardNotEarned:
        return { localeKey: 'REWARD_NOT_EARNED_MSG' };

      // After diagnose
      case ExceptionType.NoErrorFound:
        return { localeKey: 'DIAGNOSE_FINISHED_NO_ERROR_MSG' };

      // Access server is in the maintenance mode
      case ExceptionType.Maintenance:
        return { localeKey: 'MAINTENANCE_MODE_MSG' };

      case ExceptionType.VpnServiceRevoked:
        return { localeKey: 'VPN_SERVICE_REVOKED_MSG' };

      // Premium exceptions
      case ExceptionType.PremiumOnly:
        return this.premiumOnlyExceptionHandler(err);

      // Currently happened only for Rewarded Ad
      case ExceptionType.LoadAd:
        return { localeKey: 'REWARDED_AD_LOAD_ERROR_MSG' };

      // Currently happened only for Rewarded Ad
      case ExceptionType.ShowAd:
        return { localeKey: 'REWARDED_AD_SHOW_ERROR_MSG' };

      case ExceptionType.AdBlocker:
        return { action: { isPrivateDnsError: true } };

      // Could not connect after a specific time
      case ExceptionType.ConnectionTimeout:
        return { localeKey: 'CONNECTION_TIMEOUT_MSG', action: { showDiagnose: true } };

      // Access server exceptions
      case ExceptionType.Session:
        return this.sessionExceptionHandler(err);

      case ExceptionType.UnreachableProxyServer:
        return { localeKey: 'UNREACHABLE_PROXIES_MESSAGE' };

      // Store billing failures arrive store-agnostic: every billing provider maps its store's
      // own codes into BillingErrorCode before anything crosses the client API.
      case 'BillingException':
        return this.billingExceptionHandler(err);

      case 'HttpRequestException':
        return { text: err.message };

      // Default message for unhandled ApiException types
      default:
        return { text: err.message ?? err };
    }
  }

  private static async sessionExceptionHandler(err: ApiException): Promise<ShowErrorOptions> {
    switch (err.data?.ErrorCode) {

      case SessionErrorCode.SessionSuppressedBy:
        return { localeKey: 'SESSION_SUPPRESSED_BY_OTHER' };

      // The access server, not a portal clock, said this credential is no longer usable.
      case SessionErrorCode.AccessExpired:
        if (VpnHoodApp.instance.data.isPremiumSupported) {
          // Somebody whose subscription is live is not somebody whose access ended (keyring plan
          // §4): the account keeps serving a paid code even after a refusal, deliberately, so the
          // refusal is OUR fault to fix and not theirs. Telling a payer their access expired and
          // asking them to restore premium is both wrong and insulting.
          if (VpnHoodApp.instance.data.isPremiumByAccount)
            return { localeKey: 'SUBSCRIPTION_NOT_PROVISIONED_MSG' };

          // Nothing to remove and nothing to choose (keyring plan §7, §8): the code is KEPT, and
          // what the person is offered is what exists — Restore Premium, plus Change code wherever
          // this build may take a typed one.
          const profile = VpnHoodApp.instance.data.state.clientProfile;
          return { localeKey: 'PREMIUM_ACCESS_EXPIRED_MSG', action: {
            showAccessCodeActions: profile?.hasAccessCode === true,
            showChangeAccessCode: VpnHoodApp.instance.data.canImportAccessCode }
          };
        }
        return { localeKey: 'SERVER_KEY_EXPIRED' };

      // User is connected with a premium session (by Code, Google, Try or RewardedAd), and it's expired.
      case SessionErrorCode.SessionExpired:
        return { localeKey: 'PREMIUM_CONNECTION_EXPIRED_MSG' };

      // Daily limit for connecting to premium exceeded
      case SessionErrorCode.DailyLimitExceeded:
        return { localeKey: 'DAILY_LIMIT_EXCEEDED_MSG' };

      // The access server rejected the code. Said as a rejection, not an expiry (keyring plan
      // §6); the code is kept until the person retries, changes, or removes it.
      case SessionErrorCode.AccessCodeRejected:
        {
        // the same rule as above: a live subscription's code being refused is a provisioning fault
        if (VpnHoodApp.instance.data.isPremiumByAccount)
          return { localeKey: 'SUBSCRIPTION_NOT_PROVISIONED_MSG' };

        const profile = VpnHoodApp.instance.data.state.clientProfile;
        return { localeKey: 'INVALID_ACCESS_CODE', action: {
          showAccessCodeActions: profile?.hasAccessCode === true,
          showChangeAccessCode: VpnHoodApp.instance.data.canImportAccessCode }
        };
        }

      // Connection plan rejected by access server
      case SessionErrorCode.PlanRejected:
        return { localeKey: 'PLAN_REJECTED_MSG' };

      // Access server is in the maintenance mode
      case SessionErrorCode.Maintenance:
        return { localeKey: 'MAINTENANCE_MODE_MSG' };

      // Selected server isn't available anymore
      case SessionErrorCode.NoServerAvailable:
        return { localeKey: 'NO_SERVER_AVAILABLE_MSG' };

      // Selected server moved to the premium list
      case SessionErrorCode.PremiumLocation:
        return { localeKey: 'PREMIUM_LOCATION_MSG' };

      // Selected server moved to the premium list
      case SessionErrorCode.RewardedAdRejected:
        return { localeKey: 'REWARD_NOT_EARNED_MSG' };

      // Fallback for unhandled session error codes
      default:
        return { text: err.message ?? err };
    }
  }

  private static premiumOnlyExceptionHandler(err: ApiException): ShowErrorOptions {
    switch (err.data?.Feature) {
      case AppFeature.QuickLaunch:
        return { localeKey: 'QUICK_LAUNCH_NOT_SUPPORTED_MSG' };
      case AppFeature.AlwaysOn:
        return { localeKey: 'ALWAYS_ON_NOT_SUPPORTED_MSG' };

      // Fallback for unhandled session error codes
      default:
        return { text: err.message ?? err };
    }

  }

  // Branches only on the store-agnostic BillingErrorCode; which store failed, and how it spells
  // its errors, stays the billing provider's business. The store's own message is shown only on
  // Unknown, where the generic text alone would explain nothing.
  private static async billingExceptionHandler(err: ApiException): Promise<ShowErrorOptions> {
    const storeMessage = err.data?.StoreMessage as string | undefined;

    switch (err.data?.BillingErrorCode) {
      case 'Cancelled':
        return { ignoreMessage: true };

      case 'Pending':
        return { localeKey: 'BILLING_PENDING_PURCHASE' };

      case 'Unavailable':
        return { localeKey: 'BILLING_UNAVAILABLE' };

      case 'NetworkError':
        return { localeKey: 'BILLING_NETWORK_ERROR' };

      case 'ProductUnavailable':
        return { localeKey: 'BILLING_ITEM_UNAVAILABLE' };

      case 'AlreadyOwned':
        return { localeKey: 'SELECTED_PLAN_ALREADY_SUBSCRIBED' };

      case 'NotOwned':
        return { localeKey: 'BILLING_ITEM_NOT_OWNED' };

      default:
        return {
          localeKey: 'ORDER_PROCESSING_FAILED',
          text: storeMessage ? `${i18n.global.t('STORE_EXCEPTION_MESSAGE')} ${storeMessage}` : ''
        };
    }
  }
}
