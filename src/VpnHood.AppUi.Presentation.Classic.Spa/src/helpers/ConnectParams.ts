import { ConnectPlanId } from '@/services/VpnHood.Client.Api';

export interface ConnectParams {
  vpnProfileId: string;
  serverLocation: string | null;
  isPremium: boolean;
  planId: ConnectPlanId;
  isDiagnose?: boolean;
  goToHome?: boolean;
}
