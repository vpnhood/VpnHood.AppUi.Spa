export class Validators {

  public static validateIp(value: string | null, errorMessage = 'Invalid IP address'): true | string {
    if (!value || value.trim() === '') return true;
    return ipRegex.test(value.trim()) ? true : errorMessage;
  }

  public static formatIpInput(value: string): string {
    const raw = value.trim().toLowerCase();

    if (raw.includes(':')) {
      return formatIPv6(raw); // preserves compressed IPv6
    }

    if (/^(\d{1,3}\.){0,3}\d{1,3}$/.test(raw)) {
      return raw;
    }

    return formatIPv4(raw);
  }

  public static isEmptyString(value: string | null | undefined): boolean{
    return value == null || value.trim() === '';
  }

  public static isNullOrUndefined(value: unknown): boolean {
    return value === null || value === undefined;
  }

}

const ipRegex: RegExp =
  /^((([0-9]{1,3}\.){3}[0-9]{1,3})|(([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|([a-fA-F0-9]{1,4}:){1,7}:|([a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|([a-fA-F0-9]{1,4}:){1,5}(:[a-fA-F0-9]{1,4}){1,2}|([a-fA-F0-9]{1,4}:){1,4}(:[a-fA-F0-9]{1,4}){1,3}|([a-fA-F0-9]{1,4}:){1,3}(:[a-fA-F0-9]{1,4}){1,4}|([a-fA-F0-9]{1,4}:){1,2}(:[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:((:[a-fA-F0-9]{1,4}){1,6})|:((:[a-fA-F0-9]{1,4}){1,7}|:)|::ffff:(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}))$/;

function formatIPv4(value: string): string {
  // noinspection RegExpSimplifiable
  const segments = value.split('.').map(s => s.replace(/[^\d]/g, '')).filter(Boolean);
  const parts: string[] = [];

  for (const segment of segments) {
    if (segment.length <= 3) {
      parts.push(segment);
    } else {
      for (let i = 0; i < segment.length && parts.length < 4; i += 3) {
        parts.push(segment.slice(i, i + 3));
      }
    }
    if (parts.length >= 4) break;
  }

  return parts.join('.');
}

function formatIPv6(value: string): string {
  const trimmed = value.trim();

  // If input contains colons, assume it's structured IPv6 and leave it alone
  if (trimmed.includes(':')) {
    return trimmed;
  }

  // Otherwise, format raw hex into expanded IPv6
  const hex = trimmed.replace(/[^a-fA-F0-9]/g, '');
  const parts: string[] = [];

  for (let i = 0; i < hex.length && parts.length < 8;) {
    const remaining = hex.length - i;
    parts.push(hex.slice(i, i + Math.min(4, remaining)));
    i += 4;
  }

  return parts.join(':');
}
