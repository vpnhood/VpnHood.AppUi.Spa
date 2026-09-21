<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import AppBar from '@/components/AppBar.vue';
import { ChannelProtocol } from '@/services/VpnHood.Client.Api';
import { computed, ref } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const isChinaCountry = ref(vhApp.data.state.clientCountryInfo?.countryCode?.toUpperCase() === 'CN');
const isUdpSupported = computed(() => {
  return vhApp.data.isProtocolEnabled(ChannelProtocol.Udp);
})
function calcUsage(received: number | undefined, sent: number | undefined): string {
  if (received === undefined || sent === undefined) return '0';
  return calcUnit(received + sent);
}
function calcUnit(total: number): string{
  const mb = 1_000_000;
  const gb = 1_000 * mb;
  const unit = total >= gb ? 'GB' : 'MB';
  const totalPerUnit = unit === 'GB' ? (total / gb) : (total / mb);

  const totalFixed = Number(totalPerUnit.toFixed(1));
  const formattedNumber = new Intl.NumberFormat().format(totalFixed);

  return `${formattedNumber} ${unit}`;
}
</script>

<template>
  <v-sheet v-if="vhApp.data.state.sessionInfo">
    <app-bar/>

    <v-defaults-provider :defaults="{
      'VIcon':{size:'18', disabled: true},
      'VCardText':{class: 'text-disabled text-body-small'}
    }">

      <!-- Date -->
      <config-card v-if="vhApp.data.isPremiumUser && vhApp.data.state.sessionInfo.accessInfo">
        <v-card-title>
          {{locale('PREMIUM_INFO')}}
          <v-icon icon="mdi-crown"/>
        </v-card-title>
        <v-card-subtitle>{{locale('STATISTICS_DATE_CARD_DESC')}}</v-card-subtitle>

        <v-card-text>
          <ul class="info-table">

            <li v-if="vhApp.data.isPremiumSupported && vhApp.data.isPremiumUser" class="border-b">
              <span>{{locale('PREMIUM_BY')}}</span>
              <span class="text-active">
                {{locale(vhApp.data.isPremiumByAccount ? 'PURCHASE_SUBSCRIPTION' : 'PREMIUM_CODE')}}
              </span>
            </li>

            <li class="border-b">
              <span>{{locale('ACTIVATED_ON')}}</span>
              <span class="text-active">
                {{ Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.createdTime) }}
              </span>
            </li>

            <li class="border-b">
              <span>{{locale('EXPIRATION_DATE')}}</span>
              <span :class="[vhApp.data.state.sessionInfo.accessInfo.expirationTime ? 'text-error' : 'text-active']">
                {{ vhApp.data.state.sessionInfo.accessInfo.expirationTime
                ? Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.expirationTime)
                : locale('NEVER') }}
              </span>
            </li>

            <li>
              <span>{{locale('LAST_USED')}}</span>
              <span class="text-highlight">
                {{ Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.lastUsedTime) }}
              </span>
            </li>

          </ul>
        </v-card-text>
      </config-card>

      <!-- Server and IP -->
      <config-card v-if="vhApp.data.state.sessionInfo.accessInfo" :disabled="!vhApp.data.isConnected">
        <v-card-title>
          {{locale('SERVER_AND_IP')}}
          <v-icon icon="mdi-server-outline"/>
        </v-card-title>
        <v-card-subtitle>{{locale('STATISTICS_SERVER_CARD_DESC')}}</v-card-subtitle>

        <v-card-text>
          <ul v-if="vhApp.data.isConnected" class="info-table">

            <li class="border-b">
              <span>{{locale('YOUR_PROTECTED_IP')}}</span>
              <span class="text-highlight">{{vhApp.data.state.sessionInfo.clientPublicIpAddress}}</span>
            </li>

            <!--            <li class="border-b">
                          <span>Current public IP</span>
                          <span class="text-active">
                          </span>
                        </li>-->

            <li class="border-b">
              <span>{{locale('COUNTRY')}}</span>
              <span class="text-active">
                {{ vhApp.data.state.sessionInfo.serverLocationInfo?.countryName }}
              </span>
            </li>

            <li class="border-b">
              <span>{{locale('REGION')}}</span>
              <span class="text-active">
                {{ vhApp.data.state.sessionInfo.serverLocationInfo?.regionName }}
              </span>
            </li>

            <li>
              <span>{{locale('UDP_SUPPORTED')}}</span>
              <span :class="[isUdpSupported ? 'text-active' : 'text-error']">
                {{locale(isUdpSupported ? 'YES' : 'NO')}}
              </span>
            </li>

          </ul>
          <div v-else class="text-center">
            <v-icon icon="mdi-information-outline" size="30"/>
            <p class="mt-3">{{locale('DISPLAY_INFO_AFTER_CONNECTION')}}</p>
          </div>
        </v-card-text>
      </config-card>

      <!-- Devices -->
      <config-card v-if="vhApp.data.isPremiumUser && vhApp.data.state.sessionInfo.accessInfo">
        <v-card-title>
          {{locale('DEVICES')}}
          <v-icon icon="mdi-cellphone-link"/>
        </v-card-title>
        <v-card-subtitle>
          {{locale('STATISTICS_DEVICES_CARD_DESC', {x: vhApp.data.state.sessionInfo.accessInfo.deviceLifeSpan})}}
        </v-card-subtitle>

        <v-card-text>
          <ul class="info-table">
            <li class="border-b">
              <span>{{locale('USED_DEVICE')}}</span>
              <span v-if="vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.hasMoreDevices" class="text-highlight">
                {{locale('MORE_THAN_X_DEVICES', {x: vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.deviceCount})}}
              </span>
              <span v-else class="text-highlight">
                {{ vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.deviceCount }}
              </span>
            </li>
            <li>
              <span>{{locale('MAX_DEVICE')}}</span>
              <span class="text-active">
                {{ vhApp.data.state.sessionInfo.accessInfo.maxDeviceCount > 0
                ? vhApp.data.state.sessionInfo.accessInfo.maxDeviceCount
                : locale('UNLIMITED') }}
              </span>
            </li>
          </ul>
        </v-card-text>
      </config-card>

      <!-- Session traffic -->
      <config-card v-if="!isChinaCountry">
        <v-card-title>
          {{locale('SESSION_TRAFFIC')}}
          <v-icon icon="mdi-chart-timeline-variant"/>
        </v-card-title>
        <v-card-subtitle>{{locale('STATISTICS_SESSION_TRAFFIC_CARD_DESC')}}</v-card-subtitle>

        <v-card-text>
          <ul class="info-table">
            <li class="border-b">
              <span>{{locale('USED')}}</span>
              <span class="text-highlight" dir="ltr">
                {{ calcUsage(vhApp.data.state.sessionStatus?.sessionTraffic.received, vhApp.data.state.sessionStatus?.sessionTraffic.sent)
                }}
              </span>
            </li>
            <li>
              <span>{{locale('MAX_TRAFFIC')}}</span>
              <span
                dir="ltr"
                :class="[vhApp.data.state.sessionStatus?.sessionMaxTraffic &&
                vhApp.data.state.sessionStatus.sessionMaxTraffic > 0 ? 'text-error' : 'text-active']">
                {{vhApp.data.state.sessionStatus?.sessionMaxTraffic && vhApp.data.state.sessionStatus.sessionMaxTraffic > 0 ?
                calcUnit(vhApp.data.state.sessionStatus.sessionMaxTraffic) : locale('UNLIMITED')}}
              </span>
            </li>
          </ul>
        </v-card-text>
      </config-card>

      <!-- Monthly traffic -->
      <config-card v-if="!isChinaCountry">
        <v-card-title>
          {{locale('MONTHLY_TRAFFIC')}}
          <v-icon icon="mdi-chart-timeline-variant"/>
        </v-card-title>
        <v-card-subtitle>{{locale('STATISTICS_MONTHLY_TRAFFIC_CARD_DESC')}}</v-card-subtitle>

        <v-card-text>
          <ul class="info-table">
            <li class="border-b">
              <span>{{locale('USED')}}</span>
              <span class="text-highlight" dir="ltr">
                {{ calcUsage(vhApp.data.state.sessionStatus?.cycleTraffic.received, vhApp.data.state.sessionStatus?.cycleTraffic.sent)
                }}
              </span>
            </li>
            <li>
              <span>{{locale('MAX_TRAFFIC')}}</span>
              <span
                dir="ltr"
                :class="[vhApp.data.state.sessionInfo.accessInfo?.maxCycleTraffic &&
                vhApp.data.state.sessionInfo.accessInfo.maxCycleTraffic > 0 ? 'text-error' : 'text-active']">
                {{vhApp.data.state.sessionInfo.accessInfo?.maxCycleTraffic && vhApp.data.state.sessionInfo.accessInfo.maxCycleTraffic > 0 ?
                calcUnit(vhApp.data.state.sessionInfo.accessInfo.maxCycleTraffic) : locale('UNLIMITED')}}
              </span>
            </li>
          </ul>
        </v-card-text>
      </config-card>

      <!-- Total traffic -->
      <config-card v-if="vhApp.data.isPremiumUser && !isChinaCountry">
        <v-card-title>
          {{locale('TOTAL_TRAFFIC')}}
          <v-icon icon="mdi-chart-timeline-variant"/>
        </v-card-title>
        <v-card-subtitle>{{locale('STATISTICS_TOTAL_TRAFFIC_CARD_DESC')}}</v-card-subtitle>

        <v-card-text class="text-disabled text-body-small mt-3">
          <ul class="info-table">
            <li class="border-b">
              <span>{{locale('USED')}}</span>
              <span class="text-highlight" dir="ltr">
                {{ calcUsage(vhApp.data.state.sessionStatus?.totalTraffic.received, vhApp.data.state.sessionStatus?.totalTraffic.sent)
                }}
              </span>
            </li>
            <li>
              <span>{{locale('MAX_TRAFFIC')}}</span>
              <span
                dir="ltr"
                :class="[vhApp.data.state.sessionInfo.accessInfo?.maxTotalTraffic &&
                vhApp.data.state.sessionInfo.accessInfo.maxTotalTraffic > 0 ? 'text-error' : 'text-active']">
                {{vhApp.data.state.sessionInfo.accessInfo?.maxTotalTraffic && vhApp.data.state.sessionInfo.accessInfo.maxTotalTraffic > 0 ?
                calcUnit(vhApp.data.state.sessionInfo.accessInfo.maxTotalTraffic) : locale('UNLIMITED')}}
              </span>
            </li>
          </ul>
        </v-card-text>
      </config-card>

    </v-defaults-provider>
  </v-sheet>
</template>

<style scoped>
.info-table{
  /* A plain ul keeps the browser's 40px start padding and bullets; this table look needs neither. */
  padding: 0;
  list-style: none;
}
.info-table>li{
  display: flex;
  align-content: center;
  justify-content: space-between;
  padding: 5px 0;
}
.info-table>li>span:first-child{
  margin-inline-end: 20px;
}
.info-table>li>span:last-child{
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
