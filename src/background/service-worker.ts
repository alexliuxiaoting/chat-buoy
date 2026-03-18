/**
 * Service Worker (Background Script)
 *
 * Manifest V3 requires a service worker even if minimal.
 * For MVP, it handles:
 * - Extension install event (welcome message)
 * - Future: cross-tab coordination, settings sync
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Chat Buoy] 🛟 Extension installed! Navigate to ChatGPT to see it in action.');
  } else if (details.reason === 'update') {
    console.log(`[Chat Buoy] 🛟 Updated to version ${chrome.runtime.getManifest().version}`);
  }
});
