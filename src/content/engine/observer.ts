import type { SiteAdapter } from '../adapters/adapter.interface';
import { MUTATION_DEBOUNCE_MS } from '@/shared/constants';

/**
 * DOMObserver — wraps MutationObserver to watch for new messages.
 *
 * Design goals (Jeff Dean style):
 * - O(1) per mutation: never re-scan the entire DOM on each change
 * - Debounced callbacks: batch rapid mutations into a single re-parse
 * - Clean teardown: disconnect on SPA navigation
 */
export class DOMObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private adapter: SiteAdapter,
    private onMutation: () => void
  ) {}

  /**
   * Start observing the message container for child additions.
   * Returns true if observation started successfully.
   */
  start(): boolean {
    const container = this.adapter.getScrollContainer();
    if (!container) {
      console.warn('[Chat Buoy] Could not find scroll container to observe');
      return false;
    }

    this.observer = new MutationObserver((mutations) => {
      // Quick filter: only care about childList changes (new messages)
      const hasNewNodes = mutations.some(
        (m) => m.type === 'childList' && m.addedNodes.length > 0
      );
      if (!hasNewNodes) return;

      // Debounce: batch rapid mutations (e.g., streaming response)
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.onMutation();
      }, MUTATION_DEBOUNCE_MS);
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return true;
  }

  /** Stop observing and clean up */
  disconnect(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
