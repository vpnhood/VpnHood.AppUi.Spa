import { ChannelProtocol, VpnProfileInfo } from '@/services/VpnHood.Client.Api';
import vuetify from '@/theme/vuetify';
import i18n from '@/locales/i18n';

export class Util {
  // VPN profile has a single location
  public static isSingleLocation(locationCount: number): boolean {
    return locationCount < 2;
  }

  // Location count of VPN profile
  public static calcLocationCount(vpnProfileInfo: VpnProfileInfo): number {
    const excludeAutoSelect = vpnProfileInfo.locationInfos.filter(
      x => x.countryCode !== '*' && !x.isNestedCountry
    );
    return excludeAutoSelect.length;
  }

  public static getLocalizedRightChevron(): string {
    return vuetify.locale.isRtl.value ? 'mdi-chevron-left' : 'mdi-chevron-right';
  }

  // noinspection JSUnusedGlobalSymbols
  public static getLocalizedLeftChevron(): string {
    return vuetify.locale.isRtl.value ? 'mdi-chevron-right' : 'mdi-chevron-left';
  }

  public static getShortDate(date: Date | null | undefined): string {
    if (!date) return '-';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    return formattedDate;
  }

  public static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // A file of the assets folder (src/assets/images), by its own name: the folder is served as
  // it is - no hash, no inlining - and the same file is what the native UI reads from it.
  public static getAssetPath(fileName: string): string {
    return Util.getStoreAssetPath(`images/${fileName}`);
  }

  /** An asset of the UI's store by its path there ("images/rocket.webp"), as the app's web host serves it. */
  public static getStoreAssetPath(assetPath: string): string {
    return `/assets/${assetPath}`;
  }

  public static protocolTitle(protocol: ChannelProtocol): string {
    switch (protocol) {
      case ChannelProtocol.Udp:
        return "PROTOCOL_UDP";
      case ChannelProtocol.Tcp:
        return "PROTOCOL_TCP";
      case ChannelProtocol.Quic:
        return "PROTOCOL_QUIC";
    }
  }

  public static getRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return '-';

    const locale = i18n.global.t;
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;

    // Calculate difference in seconds
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

    // Handle future dates or very recent (less than 5 seconds)
    if (diffInSeconds < 5) {
      return locale('TIME_JUST_NOW');
    }

    // Seconds (5-59 seconds)
    if (diffInSeconds < 60) {
      const unit = diffInSeconds === 1 ? locale('SECOND') : locale('SECONDS');
      return locale('TIME_SECONDS_AGO', { count: diffInSeconds, unit });
    }

    // Minutes (1-59 minutes)
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      const unit = diffInMinutes === 1 ? locale('MINUTE') : locale('MINUTES');
      return locale('TIME_MINUTES_AGO', { count: diffInMinutes, unit });
    }

    // Hours (1-23 hours)
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      const unit = diffInHours === 1 ? locale('HOUR') : locale('HOURS');
      return locale('TIME_HOURS_AGO', { count: diffInHours, unit });
    }

    // Days (1+ days)
    const diffInDays = Math.floor(diffInHours / 24);
    const unit = diffInDays === 1 ? locale('DAY') : locale('DAYS');
    return locale('TIME_DAYS_AGO', { count: diffInDays, unit });
  }

  public static formatLatency(timeSpan: string | null | undefined): string {
    if (!timeSpan) return '-';

    // Parse TimeSpan format (e.g., "00:00:00.1234567" or "1.23:45:56.7890123")
    // Format: [days.]hours:minutes:seconds[.fractionalSeconds]

    try {
      const parts = timeSpan.split(':');
      if (parts.length < 3) return timeSpan;

      // Get the seconds part which may contain fractional seconds
      const secondsPart = parts[parts.length - 1];
      const [seconds, fractionalSeconds] = secondsPart.split('.');

      // Calculate total milliseconds
      let totalMs = 0;

      // Handle optional days in the first part
      const firstPart = parts[0];
      if (firstPart.includes('.')) {
        const [days, hours] = firstPart.split('.');
        totalMs += parseInt(days) * 24 * 60 * 60 * 1000;
        totalMs += parseInt(hours) * 60 * 60 * 1000;
        totalMs += parseInt(parts[1]) * 60 * 1000; // minutes
      } else {
        totalMs += parseInt(parts[0]) * 60 * 60 * 1000; // hours
        totalMs += parseInt(parts[1]) * 60 * 1000; // minutes
      }

      totalMs += parseInt(seconds) * 1000;

      // Add fractional seconds (convert to milliseconds)
      if (fractionalSeconds) {
        // .NET TimeSpan uses 7 digits for fractional seconds (ticks)
        // We need to convert to milliseconds (3 digits)
        const fractionStr = fractionalSeconds.substring(0, 3).padEnd(3, '0');
        totalMs += parseInt(fractionStr);
      }

      return `${totalMs} ms`;
    } catch {
      return timeSpan;
    }
  }

  public static async isUrlAccessible(url: string, loadContent: boolean = false): Promise<boolean> {

    if (loadContent) {
      return new Promise((resolve) => {
        const img = new Image();

        const timer = setTimeout(() => {
          img.src = "";
          resolve(false);
        }, 5000);

        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };

        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };

        img.src = url;
      });
    }

    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  public static toBoolean(value: unknown): boolean {
    if (value == null)
      return false;

    if (typeof value === "boolean")
      return value;

    if (typeof value === "number")
      return value !== 0;

    if (typeof value === "string") {
      const v = value.trim().toLowerCase();

      if (v === "true" || v === "1" || v === "yes" || v === "on")
        return true;

      if (v === "false" || v === "0" || v === "no" || v === "off" || v === "")
        return false;
    }

    // fallback (JS truthy/falsy)
    return Boolean(value);
  }


  public static calcPercentage(firstNumber: number, secondNumber: number): number {
    return Math.round(((firstNumber - secondNumber) / firstNumber) * 100);
  }

  // For developers sends test error
    /*public static sendTestError(): void {
      const errorMessage = 'Something went wrong';
      const statusCode = 401;
      const responseBody = {
        typeName: ExceptionType.UnreachableServerLocation,
        message: 'Invalid email',
        data: {
          IsAutoLocation: true,
          ErrorCode: 'AccessExpired',
          BillingResponseCode: 'Error',
          PurchaseState: 'purchase state',
          BillingMessage: 'billing message'
        },
      };
      const headers = { 'Content-Type': 'application/json' };

      const apiException = new ApiException(errorMessage, statusCode, responseBody, headers);
      throw apiException;
    }*/
}
