<script setup lang="ts">
import { computed } from 'vue';
import qrcode from 'qrcode-generator';

const props = defineProps<{
  value: string,
}>();

// The quiet zone the spec requires. A code drawn edge to edge is the single most common reason a
// scanner refuses one, and on a screen there is no paper margin to fall back on.
const margin = 4;

const code = computed(() => {
  // Type 0 picks the smallest version that fits the text. Level M (15% recovery) is the right
  // choice for a screen: Q and H would only buy redundancy against damage that a display cannot
  // suffer, and they pay for it in modules — a denser code is harder to read across a room, not
  // easier. The default byte encoder is single-byte, which is all an ASCII URL needs.
  const qr = qrcode(0, 'M');
  qr.addData(props.value);
  qr.make();

  const count = qr.getModuleCount();

  // One <path> rather than a rect per module: even a modest version is 33x33, so the rect form
  // would put a thousand nodes in the DOM for a picture that never changes.
  let path = '';
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++)
      if (qr.isDark(row, col))
        path += `M${col} ${row}h1v1h-1z`;

  return { size: count + margin * 2, path };
});
</script>

<template>
  <!-- crispEdges because the browser's default anti-aliasing softens every module boundary, and
       that boundary is exactly the contrast the camera is looking for. -->
  <svg
    class="qr-code"
    :viewBox="`${-margin} ${-margin} ${code.size} ${code.size}`"
    xmlns="http://www.w3.org/2000/svg"
    shape-rendering="crispEdges"
  >
    <!-- Black on white always, never the theme's colours: a good number of scanners reject an
         inverted code outright and the rest are slower about it. The plate is part of the drawing
         rather than the container so the quiet zone cannot be cropped by a parent's padding. -->
    <rect :x="-margin" :y="-margin" :width="code.size" :height="code.size" fill="#ffffff"/>
    <path :d="code.path" fill="#000000"/>
  </svg>
</template>

<style scoped>
.qr-code {
  display: block;
  width: 100%;
  height: auto;
}
</style>
