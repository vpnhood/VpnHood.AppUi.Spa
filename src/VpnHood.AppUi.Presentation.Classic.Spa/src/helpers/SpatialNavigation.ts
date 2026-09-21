import { VpnHoodApp } from '@/services/VpnHoodApp';

// The D-pad on the TV UI. The browser has a walk of its own (spatial navigation: Android's WebView
// turns it on for a device without a touchscreen, the Windows host turns it on in TV mode), and it
// is not usable as it comes: it treats anything with a click handler as a focus target, and Vuetify
// puts click handlers on radio labels, switch tracks and control wrappers, so the ring landed on a
// label as a rectangle or on an invisible wrapper as nothing, and the jumps followed the geometry
// of those (from the cloak switch, Down went to the QUIC row because its text was the widest).
// Verified on the protocols page, 2026-09-12. The same rules apply on the TV itself.
//
// So the app decides, and cancels the browser's own move by handling the arrows first:
// - what a target is: a link, a button, a form control, or anything the app gave a tabindex other
//   than -1 (Vuetify's list items carry -2; -1 is the app's mark for a decorative control);
// - where a step goes: to the nearest target in the pressed direction, measured on rectangles —
//   a target inside a data-tv-row element, or inside a radio, is measured on that row, so a radio's
//   or a switch's step is the whole row and not the 40px control at its edge, and general.css draws
//   the ring on the row for the same reason (Leanback's model: the row is the thing you are on);
// - inside an open dialog or menu only that overlay's targets count, which is also what the eye sees.
// Enter on a radio or a checkbox clicks it: the D-pad centre arrives as Enter, which those inputs
// do nothing with by themselves (Space is their key). A text field keeps Left and Right for its
// caret, and a slider or a select keeps all four. With nothing to go to, the page scrolls a little,
// so a long text can still be read to its end.
type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const TARGET_SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';
// Every radio in the app is a title over a description, so a radio's row is a row by nature.
const ROW_SELECTOR = '[data-tv-row], .v-radio';
const TEXT_INPUT_TYPES = new Set(['text', 'password', 'search', 'url', 'email', 'number', 'tel']);
const SCROLL_STEP = 120;

// A rectangle's edges must not be behind the current one's in the pressed direction; this much
// slack forgives a row that sits a pixel or two off.
const EDGE_TOLERANCE = 4;

function isTarget(el: HTMLElement): boolean {
  // a list root only forwards its focus to a child; the children are the targets
  if (el.classList.contains('v-list'))
    return false;
  if (el.getAttribute('tabindex') === '-1')
    return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.closest('[inert]'))
    return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// The topmost active Vuetify overlay (a dialog, a menu), else the page.
function scopeRoot(): Element {
  const overlays = document.querySelectorAll('.v-overlay--active > .v-overlay__content');
  return overlays.length ? overlays[overlays.length - 1] : document.body;
}

function rowOf(el: HTMLElement): HTMLElement {
  return el.closest<HTMLElement>(ROW_SELECTOR) ?? el;
}

function isRtl(): boolean {
  const app = document.querySelector('.v-application') ?? document.documentElement;
  return getComputedStyle(app).direction === 'rtl';
}

function isTextEntry(el: Element | null): boolean {
  return el instanceof HTMLTextAreaElement
    || (el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type))
    || (el instanceof HTMLElement && el.isContentEditable);
}

// Lower is nearer; null is "not in that direction". The distance along the pressed direction, plus
// twice the gap between the two rectangles' projections on the other axis (zero when they overlap,
// which is what makes a walk down a column of rows step row by row), plus a little for the centre
// offset so that, among rows that all overlap, the one in line wins.
function scoreOf(from: DOMRect, to: DOMRect, direction: Direction): number | null {
  let primary: number;
  switch (direction) {
    case 'down':
      if (to.top < from.bottom - EDGE_TOLERANCE) return null;
      primary = to.top - from.bottom;
      break;
    case 'up':
      if (to.bottom > from.top + EDGE_TOLERANCE) return null;
      primary = from.top - to.bottom;
      break;
    case 'right':
      if (to.left < from.right - EDGE_TOLERANCE) return null;
      primary = to.left - from.right;
      break;
    case 'left':
      if (to.right > from.left + EDGE_TOLERANCE) return null;
      primary = from.left - to.right;
      break;
  }

  primary = Math.max(0, primary);
  const vertical = direction === 'up' || direction === 'down';
  const [fromStart, fromEnd, toStart, toEnd] = vertical
    ? [from.left, from.right, to.left, to.right]
    : [from.top, from.bottom, to.top, to.bottom];
  const orthogonal = Math.max(0, toStart - fromEnd, fromStart - toEnd);

  // A cone, not a half-plane: on the home page the last row's Down otherwise landed on the Connect
  // button, off to the left and one pixel lower. A sideways step gets the wider cone, since a
  // column beside another column is what Left and Right are for.
  const cone = vertical ? { slope: 1, base: 24 } : { slope: 2, base: 48 };
  if (orthogonal > primary * cone.slope + cone.base)
    return null;

  // Among rows that all overlap, the one whose leading edge is nearest wins: stepping down from a
  // full-width row into a row of three buttons lands on the first of them, the reading start (left
  // in LTR, right in RTL), not the middle one, which is what nearest-centre gave. Sideways, top edges.
  const alignment = vertical
    ? (isRtl() ? Math.abs(to.right - from.right) : Math.abs(to.left - from.left))
    : Math.abs(to.top - from.top);
  return primary + 2 * orthogonal + 0.1 * alignment;
}

// Moves focus one step; false when nothing lies that way.
function move(direction: Direction): boolean {
  const root = scopeRoot();
  const targets = Array.from(root.querySelectorAll<HTMLElement>(TARGET_SELECTOR)).filter(isTarget);
  const active = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null;

  // nothing under the remote yet, or a container rather than a target (Vuetify parks focus on a
  // dialog's content wrapper, whose rectangle holds every button, so no button is "below" it):
  // the first target is the place to start
  if (!active || !root.contains(active) || !targets.includes(active)) {
    targets[0]?.focus();
    return targets[0] !== undefined;
  }

  const fromRow = rowOf(active);
  const from = fromRow.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of targets) {
    const row = rowOf(el);
    if (el === active || row === fromRow)
      continue;

    const score = scoreOf(from, row.getBoundingClientRect(), direction);
    if (score !== null && score < bestScore) {
      best = el;
      bestScore = score;
    }
  }

  if (!best)
    return false;

  best.focus({ preventScroll: true });
  rowOf(best).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

function onKeydown(e: KeyboardEvent): void {
  if (!VpnHoodApp.instance.data.isTvUi)
    return;

  const active = document.activeElement;
  if (e.key === 'Enter') {
    if (active instanceof HTMLInputElement && (active.type === 'radio' || active.type === 'checkbox')) {
      e.preventDefault();
      active.click();
    }
    return;
  }

  // A keyboard's Backspace stands in for the remote's Back key, which on a TV never reaches the page
  // (the Android host turns it into the web view's own back). The same step here, so a keyboard on
  // a TV, or the TV mode on Windows, can leave a page. Not inside a text field, where it deletes.
  if (e.key === 'Backspace' || e.key === 'BrowserBack') {
    if (isTextEntry(active))
      return;
    e.preventDefault();
    window.history.back();
    return;
  }

  // a modified arrow is not a D-pad press: Alt+Left is the browser's own Back, and Ctrl or Shift
  // with an arrow keeps whatever meaning the control gives it
  if (e.altKey || e.ctrlKey || e.metaKey)
    return;

  const direction = DIRECTIONS[e.key];
  if (!direction)
    return;
  if (isTextEntry(active) && (direction === 'left' || direction === 'right'))
    return;
  if (active?.closest('[role="slider"], [role="combobox"]'))
    return;

  // ours: neither the browser's walk nor Vuetify's list handler gets to act on it
  e.preventDefault();
  e.stopPropagation();

  if (!move(direction) && (direction === 'up' || direction === 'down'))
    window.scrollBy({ top: direction === 'down' ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' });
}

// Where the remote was, per scope: the page, or an overlay's content. A dialog closing takes its
// focused button away with it, and the browser moves focus to the body without a word — no blur, no
// focusout, the focus fixup fires nothing — so the next press started from the page's first target
// (owner, the countries page's Clear dialog). Restored the moment an overlay stops being active,
// while its buttons are still fading, so the ring is back on the button that opened it before the
// next press. Nothing to go back to (a page that changed under it) leaves the start to App.vue's
// first-control rule and the engine's first-target start.
// A remembered element can also be gone for good — a button that a press replaced with a field, a
// list row re-rendered — so its place is kept too, and the target now nearest that place takes over.
const lastFocused = new WeakMap<Element, { el: HTMLElement; rect: DOMRect }>();

function scopeRootOf(el: Element): Element {
  return el.closest('.v-overlay__content') ?? document.body;
}

function onFocusIn(e: FocusEvent): void {
  if (e.target instanceof HTMLElement && e.target !== document.body)
    lastFocused.set(scopeRootOf(e.target), { el: e.target, rect: rowOf(e.target).getBoundingClientRect() });
}

function centerDistance(a: DOMRect, b: DOMRect): number {
  return Math.hypot((a.left + a.right) / 2 - (b.left + b.right) / 2, (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
}

function restoreFocus(): void {
  const active = document.activeElement;
  const lost = !active || active === document.body || active.closest('.v-overlay:not(.v-overlay--active)') !== null;
  if (!lost)
    return;

  const root = scopeRoot();
  const remembered = lastFocused.get(root);
  if (!remembered)
    return;

  if (remembered.el.isConnected && isTarget(remembered.el)) {
    remembered.el.focus({ preventScroll: true });
    return;
  }

  let nearest: HTMLElement | null = null;
  let nearestDistance = Infinity;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(TARGET_SELECTOR)).filter(isTarget)) {
    const distance = centerDistance(remembered.rect, rowOf(el).getBoundingClientRect());
    if (distance < nearestDistance) {
      nearest = el;
      nearestDistance = distance;
    }
  }
  nearest?.focus({ preventScroll: true });
}

function onMutation(records: MutationRecord[]): void {
  if (!VpnHoodApp.instance.data.isTvUi)
    return;

  // an overlay going inactive, or the focused element gone with a re-render
  const overlayClosed = records.some(r => r.type === 'attributes' && r.target instanceof Element
    && r.target.classList.contains('v-overlay') && !r.target.classList.contains('v-overlay--active'));
  if (overlayClosed || !document.activeElement || document.activeElement === document.body)
    restoreFocus();
}

// Call once, from App.vue. Everything here is a no-op off the TV UI.
export function installSpatialNavigation(): void {
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('focusin', onFocusIn, true);
  new MutationObserver(onMutation).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}
