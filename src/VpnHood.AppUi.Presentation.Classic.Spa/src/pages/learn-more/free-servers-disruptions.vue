<script setup lang="ts">
import AppBar from '@/components/AppBar.vue';
import i18n from '@/locales/i18n';

const locale = i18n.global.t;
</script>

<template>
  <v-sheet>
    <app-bar/>

    <v-icon size="40" color="white" class="d-flex mx-auto mb-10" icon="mdi-book-open-page-variant-outline" />

    <div class="text-disabled">
      <h3 class="learning-title">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_1")}}</h3>
      <p>{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_2")}}</p>
      <v-divider class="my-5"/>
      <h3 class="learning-title">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_3")}}</h3>
      <p>{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_4")}}</p>
      <v-divider class="my-5"/>
      <h3 class="learning-title">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_5")}}</h3>
      <p>{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_6")}}</p>
      <v-divider class="my-5"/>
      <h3 class="learning-title">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_7")}}</h3>
      <p>{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_8")}}</p>
      <v-divider class="my-5"/>
      <h3 class="learning-title">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_9")}}</h3>
      <ul>
        <li>
          <span class="list-highlight">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_10")}}</span>
          {{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_11")}}
        </li>
        <li>
          <span class="list-highlight">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_12")}}</span>
          {{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_13")}}
        </li>
        <li>
          <span class="list-highlight">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_14")}}</span>
          {{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_15")}}
        </li>
        <li>
          <span class="list-highlight">{{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_16")}}</span>
          {{locale("LEARN_MORE_FREE_SERVERS_DISRUPTIONS_17")}}
        </li>
      </ul>
    </div>

  </v-sheet>
</template>

<style scoped>
.learning-title{
  /*noinspection CssUnresolvedCustomProperty*/
  color: rgb(var(--v-theme-highlight));
  margin-bottom: 8px;
}
p{
  padding-inline-start: 10px;
}
ul, ol{
  margin-inline-start: 16px;
}
li{
  margin-bottom: 10px;
}
li>.list-highlight{
  color: white;
}

/*noinspection CssUnusedSymbol*/
:deep(.v-divider){
  opacity: 0.15;
}
</style>
