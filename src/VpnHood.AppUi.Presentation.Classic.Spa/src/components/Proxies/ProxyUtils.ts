import i18n from '@/locales/i18n';
import { StatusQuality } from '@/services/VpnHood.Client.Api';

const locale = i18n.global.t;

export function getStatusQualityDisplay(quality?: StatusQuality): StatusQualityDisplay {
  switch (quality) {
    case StatusQuality.Excellent:
      return { text: locale('EXCELLENT'), color: 'enable-premium' };
    case StatusQuality.Good:
      return { text: locale('GOOD'), color: 'good' };
    case StatusQuality.Fair:
      return { text: locale('FAIR'), color: 'warning' };
    case StatusQuality.Poor:
      return { text: locale('POOR'), color: 'disable-premium' };
    case StatusQuality.VeryPoor:
      return { text: locale('VERY_POOR'), color: 'very-poor' };
    case StatusQuality.Failed:
      return { text: locale('FAILED'), color: 'error' };
    case StatusQuality.Unknown:
    default:
      return { text: locale('NO_DATA'), color: '' };
  }
}

export interface StatusQualityDisplay {
  text: string;
  color: string;
}
export enum ProxySheetType {
  Add = 'ADD_PROXY',
  AddList = 'ADD_PROXY_LIST',
  Edit = 'EDIT_PROXY'
}
