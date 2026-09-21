import { VpnHoodApp } from '@/services/VpnHoodApp';
import type { RouteLocationRaw } from 'vue-router';

export interface FeatureItem {
  icon: string;
  secondIcon?: string;
  title: string;
  pageLink: RouteLocationRaw;
  isActive: boolean;
}

export function getFeatureItems(): FeatureItem[] {
  const vhApp = VpnHoodApp.instance;
  return [
    {
      // One badge for the whole feature: the app reports whether ANY public traffic can travel
      // outside the tunnel right now (client splits, server splits, bypassed IPv6). It disappears
      // by itself when the split-tunneling toggle is off — the state reports no splitting.
      icon: 'mdi-call-split',
      secondIcon: 'mdi-web',
      title: 'SPLIT_TUNNELING',
      pageLink: { name: 'SPLIT_TUNNELING' },
      isActive: vhApp.data.state.splitTunnelingState.isSplittingTraffic,
    },
    {
      icon: 'mdi-ip-network',
      title: 'CUSTOM_ENDPOINT',
      pageLink: { name: 'SERVERS' },
      isActive: vhApp.data.isCustomEndpointActive,
    },
    {
      icon: 'mdi-dns',
      title: 'DNS',
      pageLink: { name: 'DNS' },
      isActive: vhApp.data.isDnsCustomized,
    },
    {
      icon: 'mdi-diversify',
      title: 'PROXIES',
      pageLink: { name: 'PROXIES' },
      isActive: vhApp.data.state.isProxyEndPointActive,
    },
  ];
}
