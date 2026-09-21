<script setup lang="ts">
import { Util } from '@/helpers/Util';
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed, onBeforeMount } from 'vue';

const vhApp = VpnHoodApp.instance;

const locale = i18n.global.t;

interface CarouselItem {
  image: string,
  title: string,
  description: string,
  height: string,
  // Some features depend on OS capabilities; undefined means supported on all platforms
  isSupported?: boolean,
}
const intentFeatures = vhApp.data.intentFeatures;
const carouselItems: CarouselItem[] = [
  {
    image: "ultra-fast-server.webp",
    title: "ULTRA_FAST_SPEED",
    description: "ULTRA_FAST_SPEED_DESC",
    height: "200px",
  },
  {
    image: "no-ads.webp",
    title: "REMOVE_AD",
    description: "REMOVE_AD_DESC",
    height: "200px",
    // Only a build that HAS ads can sell their removal. Where none exists — the App Store head, any
    // build with no ad provider — this promises to take away something the person never sees.
    isSupported: vhApp.data.features.isAdSupported,
  },
  {
    image: "more-location.webp",
    title: "MORE_LOCATIONS",
    description: "MORE_LOCATIONS_DESC",
    height: "200px",
  },
  {
    image: "split-ip.webp",
    title: "SPLIT_IP_ADDRESSES",
    description: "SPLIT_IP_ADDRESSES_PREMIUM_DESC",
    height: "200px",
  },
  {
    image: "private-dns.webp",
    title: "PRIVATE_AND_CUSTOM_DNS",
    description: "PRIVATE_AND_CUSTOM_DNS_DESC",
    height: "200px",
    isSupported: intentFeatures.isPrivateDnsSettingsSupported,
  },
  {
    image: "quick-launch.webp",
    title: "QUICK_LAUNCH",
    description: "QUICK_LAUNCH_DESC",
    height: "200px",
    isSupported: intentFeatures.isQuickLaunchSupported,
  },
  {
    image: "always-on.webp",
    title: "ALWAYS_ON",
    description: "ALWAYS_ON_PREMIUM_DESC",
    height: "200px",
    isSupported: intentFeatures.isAlwaysOnSettingsSupported,
  },
  {
    image: "support.webp",
    title: "24_7_SUPPORT",
    description: "24_7_SUPPORT_DESC",
    height: "200px",
  },
]

const displayedCarouselItems = computed(() => {
  // filter out unsupported features
  let supportedItems = carouselItems.filter(i => i.isSupported !== false);

  // filter out features that are not supported, when the premium flag is not supported because we already have all features
  if (!vhApp.data.isPremiumSupported)
    supportedItems = supportedItems.filter(i => i.title !== 'ULTRA_FAST_SPEED');
  
    return supportedItems;
});

// preload the rocket images
onBeforeMount(() => {
  ["rocket-bg.webp", "rocket-smoke.webp", "rocket.webp"]
    .map(Util.getAssetPath)
    .forEach(src => new Image().src = src);
})
</script>

<template>
  <v-carousel
    id="featuresCarousel"
    show-arrows
    delimiter-icon="mdi-circle"
    color="highlight"
    height="380"
    hide-delimiter-background
    class="text-white text-center"
  >
    <!-- Carousel arrows -->
    <template v-slot:prev="{ props }">
      <v-btn v-if="displayedCarouselItems.length > 1" color="highlight" :icon="Util.getLocalizedLeftChevron()" size="40" variant="text" @click="props.onClick" />
    </template>
    <template v-slot:next="{ props }">
      <v-btn v-if="displayedCarouselItems.length > 1" color="highlight" :icon="Util.getLocalizedRightChevron()" size="40" variant="text"
             @click="props.onClick" />
    </template>

    <!-- Carousel items -->
    <v-carousel-item v-for="item in displayedCarouselItems" :key="item.title" eager>
      <template v-slot:default>

        <!-- A slide degrades by shrinking its IMAGE, never its text: on a short window the media
             yields (flex-shrink, min-height:0) while title and description keep their size, and
             the slide's bottom padding reserves the delimiter row so text can never slide under
             the dots (see .carousel-slide). -->
        <div class="carousel-slide d-flex flex-column fill-height">

          <div v-if="item.title === 'ULTRA_FAST_SPEED'" id="rocketWrapper" class="slide-media mx-auto mb-4">
            <div id="rocket" class="animation-translate-y mx-auto" />
            <div id="rocketSmoke" class="mx-auto" />
          </div>

          <v-img
            v-else
            eager
            :src="Util.getAssetPath(item.image)"
            alt="Symbol image"
            width="100%"
            :max-height="item.height"
            class="slide-media mx-auto mb-5"
          />
          <h3 class="mb-2 flex-shrink-0">{{locale(item.title)}}</h3>
          <p class="text-label-large text-medium-emphasis px-3 flex-shrink-0">{{locale(item.description)}}</p>
        </div>
      </template>
    </v-carousel-item>
  </v-carousel>
</template>

<style scoped>
/* The dots row (v-carousel__controls) is 50px, absolutely positioned at the carousel's bottom;
   reserving it here keeps the description readable at every window height. */
.carousel-slide {
  padding-bottom: 50px;
}
.slide-media {
  flex: 1 1 auto;
  min-height: 0;
}

#rocketWrapper {
  position: relative;
  background: url('/assets/images/rocket-bg.webp') no-repeat top center;
  background-size: contain;
  width: 100%;
  max-height: 335px;
}

#rocket, #rocketSmoke {
  position: absolute;
  left: 0;
  right: 0;
}

#rocket {
  background: url('/assets/images/rocket.webp') no-repeat top center;
  background-size: contain;
  width: 100%;
  height: 56%;
  bottom: 35%;
  z-index: 1;
}

#rocketSmoke {
  background: url('/assets/images/rocket-smoke.webp') no-repeat top center;
  background-size: contain;
  width: 42%;
  height: 35%;
  bottom: 16%;
  z-index: 2;
}
</style>

<!--suppress CssUnusedSymbol -->
<style>
/* 380px is the DESIGN height (the height prop above); this lets the carousel yield when its flex
   parent has less to give (short windows), so the plans and buttons below stay on screen.
   !important intentionally outranks the prop's inline style. */
#featuresCarousel {
  height: min(380px, 100%) !important;
}
#featuresCarousel .v-carousel__controls .v-btn--icon .v-icon{
  --v-icon-size-multiplier:.8;
}
#featuresCarousel .v-carousel__controls__item{
  margin: 0 3px;
}
#featuresCarousel .v-btn--icon.v-btn--density-default {
  width: calc(var(--v-btn-height) + 6px);
  height: calc(var(--v-btn-height) + 6px);
}
</style>
