import { onMounted, onUnmounted, ref, watch, type ComponentPublicInstance, type Ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';

// Where a bar that floats over the page belongs — today only the reconnect-required alert. Android
// apps put a persistent, actionable message directly under the page title, never in the status bar
// strip above it, but no constant can say where that is here: each page draws its own header (the
// list pages' AppBar, home's, the feature pages'), they are not the same height, and edge-to-edge
// pushes every one of them down by a status bar whose height only the native side knows. So the
// header reports where its own bottom edge lands, in the coordinates the floating bar is positioned
// in (offsets from v-main, which App.vue makes the containing block), and the bar reads that one
// number instead of guessing per page.

type PageHeaderRef = HTMLElement | ComponentPublicInstance | null;

function toElement(target: PageHeaderRef): HTMLElement | null {
  if (target instanceof HTMLElement)
    return target;

  // A header whose root is a Vuetify component (home's v-row) hands back the instance, not the node.
  const rootElement = target?.$el;
  return rootElement instanceof HTMLElement ? rootElement : null;
}

// offsetTop is measured from the nearest positioned ancestor, and that is not the same element on
// every page — home's sheet is position-relative, the list pages' sheet is not — so walk the
// offsetParent chain up to v-main and sum it. Unlike getBoundingClientRect this ignores scrolling,
// which is the point: the bar pins to where the header sits at the top of the page and stays there
// while the page scrolls under it.
function bottomEdgeWithinMain(element: HTMLElement): number | null {
  const main = element.closest('.v-main');
  if (main === null)
    return null;

  let offset = 0;
  let node: HTMLElement | null = element;
  while (node !== null && node !== main) {
    offset += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }

  // A hidden header has no offsetParent chain at all, so it never reaches v-main: report nothing
  // rather than a zero that would move a visible bar into the status bar.
  return node === main ? offset + element.offsetHeight : null;
}

// Attach the returned ref to the header's root element. Every page that has a header must call this
// once; pages without one (the purchase, ad and error sheets) simply keep the last published value.
export function usePageHeaderAnchor(): Ref<PageHeaderRef> {
  const headerRef = ref<PageHeaderRef>(null);
  const uiState = VpnHoodApp.instance.data.uiState;
  let resizeObserver: ResizeObserver | null = null;

  function publish(): void {
    const element = toElement(headerRef.value);
    if (element === null)
      return;

    const bottomEdge = bottomEdgeWithinMain(element);
    if (bottomEdge !== null)
      uiState.pageHeaderBottom = bottomEdge;
  }

  onMounted(() => {
    const element = toElement(headerRef.value);
    if (element === null)
      return;

    // Observing covers the first measurement (ResizeObserver fires on observe) and every later one:
    // a title that wraps to a second line, the TV layout, a locale change.
    resizeObserver = new ResizeObserver(publish);
    resizeObserver.observe(element);
  });

  // The status bar height arrives from the native side after the first render and shifts every
  // header down. The observer cannot see it — the header moves without changing size.
  watch(() => uiState.edgeToEdgeTop, publish);

  // The published offset is deliberately NOT cleared here. Between two pages there is a moment with
  // no header at all (the router transition is out-in), and clearing would snap a visible bar up to
  // the status bar and back down again. The next header overwrites it.
  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  return headerRef;
}
