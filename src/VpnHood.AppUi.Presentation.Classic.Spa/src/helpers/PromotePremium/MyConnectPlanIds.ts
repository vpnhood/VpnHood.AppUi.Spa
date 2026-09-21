import type { ConnectPlanId } from '@/services/VpnHood.Client.Api';

export type MyConnectPlanId = ConnectPlanId | MyPlanId;
export enum MyPlanId{
  premiumByPurchase,
  premiumByCode
}
