import type { SiteAdapter } from '../adapters/adapter.interface';
import type { NavItem, ParsedMessage } from '@/shared/types';
import { SCROLL_BEHAVIOR } from '@/shared/constants';
import { DOMObserver } from './observer';
import { VisibilityTracker } from './tracker';

export type NavigationListener = (items: NavItem[]) => void;

/**
 * NavigationEngine — the brain of Chat Buoy.
 *
 * Responsibilities:
 * 1. Parse messages from the DOM via the adapter
 * 2. Maintain an ordered list of navigation items
 * 3. Track which items are currently visible
 * 4. Notify the UI when the list changes
 * 5. Handle smooth scrolling to a target message
 */
export class NavigationEngine {
  private items: NavItem[] = [];
  private listeners: NavigationListener[] = [];
  private domObserver: DOMObserver;
  private tracker: VisibilityTracker;
  private showAssistantMessages = true;

  constructor(private adapter: SiteAdapter) {
    this.domObserver = new DOMObserver(adapter, () => this.refresh());
    this.tracker = new VisibilityTracker((visibleElements) => {
      this.updateActiveStates(visibleElements);
    });
  }

  /** Start the engine: initial parse + observation */
  start(): void {
    const scrollContainer = this.adapter.getScrollContainer();
    this.tracker.start(scrollContainer);

    // Initial parse
    this.refresh();

    // Start observing for new messages
    const observing = this.domObserver.start();
    if (!observing) {
      // Retry after a short delay (page might still be loading)
      setTimeout(() => {
        this.domObserver.start();
        this.refresh();
      }, 2000);
    }
  }

  /** Subscribe to navigation list changes */
  subscribe(listener: NavigationListener): () => void {
    this.listeners.push(listener);
    // Immediately emit current state
    listener([...this.items]);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Scroll the page to a specific navigation item */
  scrollTo(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;
    item.element.scrollIntoView(SCROLL_BEHAVIOR);
  }

  /** Set whether to include assistant messages in the nav */
  setShowAssistantMessages(show: boolean): void {
    this.showAssistantMessages = show;
    this.refresh();
  }

  /** Clean up all observers and listeners */
  destroy(): void {
    this.domObserver.disconnect();
    this.tracker.disconnect();
    this.listeners = [];
    this.items = [];
  }

  /** Full re-parse of messages from the DOM */
  private refresh(): void {
    const elements = this.adapter.queryMessageElements();
    const parsed: ParsedMessage[] = [];

    for (let i = 0; i < elements.length; i++) {
      const msg = this.adapter.parseMessage(elements[i], i);
      if (!msg) continue;

      // Filter by role if needed
      if (!this.showAssistantMessages && msg.role === 'assistant') continue;

      parsed.push(msg);
    }

    // Build NavItem list, preserving active state from existing items
    const oldActiveIds = new Set(
      this.items.filter((i) => i.isActive).map((i) => i.id)
    );

    this.items = parsed.map((msg) => ({
      ...msg,
      isActive: oldActiveIds.has(msg.id),
    }));

    // Update tracker with new elements
    this.tracker.replaceAll(parsed.map((m) => m.element));

    this.emit();
  }

  /** Update which items are marked as the current visible ones */
  private updateActiveStates(visibleElements: Set<Element>): void {
    let changed = false;

    for (const item of this.items) {
      const shouldBeActive = visibleElements.has(item.element);
      if (item.isActive !== shouldBeActive) {
        item.isActive = shouldBeActive;
        changed = true;
      }
    }

    if (changed) {
      this.emit();
    }
  }

  /** Notify all subscribers */
  private emit(): void {
    const snapshot = [...this.items];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
