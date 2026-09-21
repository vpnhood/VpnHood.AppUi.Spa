import { createRouter, createWebHistory, START_LOCATION } from 'vue-router';
import { routes } from 'vue-router/auto-routes'
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { ComponentName } from '@/helpers/UiConstants';

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 }
});

// Change page title and add transition. Returning nothing continues the navigation; the next()
// callback is deprecated in vue-router 5.
router.beforeEach((to, from) => {
  // Dialog visibility lives in the query (see ComponentRouteController) so the back button can
  // close a dialog, but the state behind it lives only in memory. On a fresh page load that state
  // is gone, so a leftover param like ?ErrorDialog=true is always stale and would reopen an empty
  // dialog on every refresh — strip them once on the initial navigation, without a history entry.
  // The remote-access dialog is the exception: its state is held by the app, and the dialog rebuilds
  // it by asking for it again (RemoteAccessDialog.vue). A reload lands back in it on purpose - the
  // listener a phone is using comes back on the same port, and the screen keeps saying so.
  if (from === START_LOCATION) {
    const query = { ...to.query };
    const staleParams = Object.values(ComponentName)
      .filter(name => name !== ComponentName.RemoteAccessDialog && name in query);
    if (staleParams.length > 0) {
      staleParams.forEach(name => delete query[name]);
      return { path: to.path, query, replace: true };
    }
  }

  const toDepth = to.path.split('/').length;
  const fromDepth = from.path.split('/').length;
  to.meta.transition = toDepth >= fromDepth ? 'translate-with-fade' : 'short-translate';
});

// Update document title after navigation. Dont change the page title in beforeEach
router.afterEach((to) => {
  // Add the app name to the page title
  const appName = VpnHoodApp.instance.data.features.appName;
  document.title = `${to.meta.title} - ${appName}`;
});

export default router;
