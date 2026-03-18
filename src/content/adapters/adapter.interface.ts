import type { ParsedMessage } from '@/shared/types';

/**
 * SiteAdapter — the abstraction layer for each AI chat platform.
 *
 * Each platform (ChatGPT, Gemini, Claude, etc.) implements this interface.
 * The adapter knows HOW to find and parse messages in the host page's DOM.
 * The navigation engine remains platform-agnostic.
 */
export interface SiteAdapter {
  /** Human-readable name for this adapter */
  readonly name: string;

  /** Check if this adapter should handle the current URL */
  match(url: string): boolean;

  /**
   * CSS selector for the scrollable container that holds all messages.
   * Used to attach MutationObserver and IntersectionObserver.
   */
  getScrollContainer(): Element | null;

  /**
   * Query all message elements currently in the DOM.
   * Called on initial load and when DOM mutations are detected.
   */
  queryMessageElements(): Element[];

  /**
   * Parse a single DOM element into a ParsedMessage.
   * Returns null if the element is not a valid message.
   */
  parseMessage(element: Element, index: number): ParsedMessage | null;

  /** Detect the host page's current theme */
  getTheme(): 'light' | 'dark';
}
