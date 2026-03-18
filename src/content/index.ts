import { resolveAdapter } from './adapters/registry';
import { NavigationEngine } from './engine/navigation';
import { NavigationPanel } from './ui/panel';

/**
 * Content Script Entry Point
 *
 * This runs on every matched page (ChatGPT for MVP).
 * It resolves the right adapter, spins up the engine, and mounts the UI.
 *
 * SPA Navigation: ChatGPT is a SPA that changes URLs without page reloads.
 * We use a URL change poll to detect navigation between conversations.
 */

let currentPanel: NavigationPanel | null = null;
let currentEngine: NavigationEngine | null = null;
let lastUrl = '';

function boot(): void {
  const url = window.location.href;

  // Skip if URL hasn't changed (debounce SPA navigation)
  if (url === lastUrl && currentEngine) return;
  lastUrl = url;

  // Clean up previous instance
  teardown();

  // Find a matching adapter
  const adapter = resolveAdapter(url);
  if (!adapter) return;

  console.log(`[Chat Buoy] 🛟 Activated on ${adapter.name}`);

  // Create engine and panel
  currentEngine = new NavigationEngine(adapter);
  currentPanel = new NavigationPanel(
    currentEngine,
    () => adapter.getTheme()
  );

  // Mount UI and start engine
  currentPanel.mount();
  currentEngine.start();
}

function teardown(): void {
  currentPanel?.unmount();
  currentEngine?.destroy();
  currentPanel = null;
  currentEngine = null;
}

// ---- Initialization ----

// Initial boot (page load)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  // Small delay to let the host page finish rendering
  setTimeout(boot, 800);
}

// SPA navigation detection (ChatGPT changes URL without reloading)
let urlCheckInterval: ReturnType<typeof setInterval>;

function startUrlWatcher(): void {
  urlCheckInterval = setInterval(() => {
    if (window.location.href !== lastUrl) {
      // URL changed — re-boot with potential delay for new content to load
      setTimeout(boot, 1000);
    }
  }, 1000);
}

startUrlWatcher();

// Also listen for popstate (browser back/forward)
window.addEventListener('popstate', () => {
  setTimeout(boot, 500);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(urlCheckInterval);
  teardown();
});
