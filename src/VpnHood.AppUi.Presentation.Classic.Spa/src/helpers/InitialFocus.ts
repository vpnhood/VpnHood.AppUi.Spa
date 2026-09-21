import { onMounted, ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';

// A page arrives with nothing focused, and a remote has no pointer to put focus somewhere: its
// first press goes to whatever spatial navigation picks from the top-left, which on the home page is
// the menu icon. Each page names the control a person came for, and it takes focus on mount.
//
// Not the HTML autofocus attribute: the spec processes that once per document, so it works on the
// first load and never again when the router returns to the page. onMounted fires on every entry
// because routes are not kept alive.
//
// Only on a TV. A phone or desktop arriving with a focus ring drawn would look like a keyboard user
// had already pressed something.
//
// Usage: `const connectRef = useInitialFocus();` then `ref="connectRef"` on the element or on a
// Vuetify component whose root is the focusable element (a v-btn is).
export function useInitialFocus() {
  const target = ref<HTMLElement | { $el: HTMLElement } | null>(null);

  onMounted(() => {
    if (!VpnHoodApp.instance.data.isTvUi)
      return;

    const el = target.value instanceof HTMLElement ? target.value : target.value?.$el;
    el?.focus();
  });

  return target;
}

// The same for a dialog. Vuetify focuses the dialog's content wrapper once the enter transition
// ends, unless something inside already holds focus - and its after-enter event fires just before
// that check, which is what lets the named control take focus first. Not the autofocus attribute:
// besides being once per document, a dialog's content is rendered once and shown many times.
//
// Usage: `const { target: closeBtnRef, onAfterEnter } = useDialogFocus();` then
// `@after-enter="onAfterEnter"` on the v-dialog and `ref="closeBtnRef"` on the control.
export function useDialogFocus() {
  const target = ref<HTMLElement | { $el: HTMLElement } | null>(null);

  function onAfterEnter(): void {
    if (!VpnHoodApp.instance.data.isTvUi)
      return;

    const el = target.value instanceof HTMLElement ? target.value : target.value?.$el;
    el?.focus();
  }

  return { target, onAfterEnter };
}

// The fallback for pages that name nothing: the first control in the page in document order, which
// is where spatial navigation would start anyway — but with the ring drawn before the first press.
// Skipped when something in the page already holds focus, so a page's explicit choice (Connect on
// the home page) is never overridden. App.vue calls this once the route transition has finished:
// before that the incoming page is not laid out and cannot take focus.
export function focusFirstControl(root: Element): void {
  if (!VpnHoodApp.instance.data.isTvUi)
    return;

  const active = document.activeElement;
  if (active && active !== document.body && root.contains(active))
    return;

  // tabIndex < 0 is the tabindex="-1" the app puts on decorative controls; no client rects means
  // hidden. Disabled buttons cannot take focus and would silently swallow the call.
  const candidates = root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]');
  for (const el of candidates) {
    if (el.tabIndex < 0 || el.hasAttribute('disabled') || el.getClientRects().length === 0)
      continue;
    el.focus();
    return;
  }
}
