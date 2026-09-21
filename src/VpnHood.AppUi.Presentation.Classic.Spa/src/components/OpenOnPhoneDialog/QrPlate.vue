<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// The encoder is a few kilobytes that only a TV ever loads, and only at the moment a code is
// shown. As an async component it lands in its own chunk, fetched from the app's own spa.zip on
// first use, so every other build carries none of it.
const QrCode = defineAsyncComponent(() => import('@/components/OpenOnPhoneDialog/QrCode.vue'));

defineProps<{
  url: string,
}>();
</script>

<template>
  <div class="qr-plate mx-auto">
    <qr-code :value="url"/>
  </div>

  <!-- The address stays on screen beside the code, not instead of it. Scanning is the fast path,
       not the only one: a user with no phone to hand can still type this, and a reviewer looking
       at a TV build has to be able to read where the code goes. Forced LTR like every other
       address the app prints, or an RTL locale reorders it into something that cannot be typed. -->
  <p dir="ltr" class="text-body-small mt-4 qr-address">{{ url }}</p>
</template>

<style scoped>
/* Sized against the viewport rather than in pixels because of where this appears: a TV is watched
   from two or three metres, and the working rule for a code that scans first time is a width of
   roughly a tenth of the viewing distance. The lower bound keeps it usable on a phone-sized window
   and the upper one keeps it from filling a desktop screen. */
.qr-plate {
  position: relative;
  width: clamp(160px, 40vh, 320px);
  /* Reserves the square before the encoder's chunk lands, so the layout does not shift under the
     user - the old padding trick rather than aspect-ratio, which this app's oldest WebViews lack.
     White from the start, so what appears is the code filling in rather than a box appearing. */
  height: 0;
  padding-bottom: clamp(160px, 40vh, 320px);
  background: #ffffff;
  border-radius: 4px;
  overflow: hidden;
}

/* Individual sides rather than the inset shorthand: this app still supports old WebViews. */
.qr-plate > * {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

/* A URL offers no space to break at, so a long one would otherwise stretch its container. */
.qr-address {
  word-break: break-all;
}
</style>
