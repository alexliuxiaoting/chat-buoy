import type { SiteAdapter } from './adapter.interface';
import type { ParsedMessage } from '@/shared/types';
import { PREVIEW_MAX_LENGTH } from '@/shared/constants';

/**
 * ChatGPT Adapter
 *
 * Handles DOM parsing for chatgpt.com and chat.openai.com.
 * ChatGPT renders conversations as a series of article-like groups,
 * each containing a user or assistant message.
 *
 * DOM Structure (as of 2026-03):
 *   <div class="flex flex-col ..."> (scroll container)
 *     <article data-testid="conversation-turn-N">
 *       <div data-message-author-role="user|assistant">
 *         ...message content...
 *       </div>
 *     </article>
 *   </div>
 */
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';

  private readonly URL_PATTERNS = [
    /^https:\/\/(chat\.openai\.com|chatgpt\.com)/,
  ];

  match(url: string): boolean {
    return this.URL_PATTERNS.some((pattern) => pattern.test(url));
  }

  getScrollContainer(): Element | null {
    // ChatGPT uses a main scrollable container for conversation
    // Try multiple selectors for resilience against UI updates
    return (
      document.querySelector('main div.overflow-y-auto') ??
      document.querySelector('main [class*="react-scroll-to-bottom"]') ??
      document.querySelector('main')
    );
  }

  queryMessageElements(): Element[] {
    // Each conversation turn is an <article> with data-testid
    const articles = document.querySelectorAll(
      'article[data-testid^="conversation-turn-"]'
    );
    if (articles.length > 0) {
      return Array.from(articles);
    }

    // Fallback: look for elements with message author role attribute
    const roleElements = document.querySelectorAll(
      '[data-message-author-role]'
    );
    if (roleElements.length > 0) {
      return Array.from(roleElements);
    }

    // Last resort fallback: look for the message groupings
    return Array.from(
      document.querySelectorAll('main [data-message-id]')
    );
  }

  parseMessage(element: Element, index: number): ParsedMessage | null {
    const role = this.extractRole(element);
    if (!role) return null;

    const text = this.extractText(element);
    if (!text) return null;

    const id =
      element.getAttribute('data-testid') ??
      element.getAttribute('data-message-id') ??
      `chatgpt-msg-${index}`;

    return {
      id,
      role,
      preview: this.truncate(text, PREVIEW_MAX_LENGTH),
      element,
      index,
    };
  }

  getTheme(): 'light' | 'dark' {
    // ChatGPT applies 'dark' class on <html> element
    const html = document.documentElement;
    if (html.classList.contains('dark')) return 'dark';
    if (html.getAttribute('data-theme') === 'dark') return 'dark';

    // Check computed body background as last resort
    const bg = getComputedStyle(document.body).backgroundColor;
    if (bg) {
      const rgb = bg.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
      const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      return luminance < 0.5 ? 'dark' : 'light';
    }

    return 'light';
  }

  // --- Private helpers ---

  private extractRole(element: Element): 'user' | 'assistant' | null {
    // Check data-message-author-role on self or children
    const roleAttr =
      element.getAttribute('data-message-author-role') ??
      element.querySelector('[data-message-author-role]')
        ?.getAttribute('data-message-author-role');

    if (roleAttr === 'user') return 'user';
    if (roleAttr === 'assistant') return 'assistant';

    // Heuristic: testid includes turn number, even = user, odd = assistant
    const testId = element.getAttribute('data-testid') ?? '';
    const turnMatch = testId.match(/conversation-turn-(\d+)/);
    if (turnMatch) {
      const turnNum = parseInt(turnMatch[1], 10);
      // In ChatGPT, turn 1 = system, turn 2 = user, turn 3 = assistant, ...
      // But this is fragile; prefer data-message-author-role
    }

    return null;
  }

  private extractText(element: Element): string {
    // Try to find the prose content within the message
    const proseEl =
      element.querySelector('.markdown') ??
      element.querySelector('[data-message-author-role] + div') ??
      element.querySelector('.whitespace-pre-wrap');

    const target = proseEl ?? element;
    const text = (target.textContent ?? '').trim();
    return text;
  }

  private truncate(text: string, maxLen: number): string {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';

    const SHORT_LINE_THRESHOLD = 15;
    let result = lines[0];

    // If the first line is very short (e.g. "很好。", "Sure!"),
    // concatenate more lines to build a meaningful preview.
    if (result.length <= SHORT_LINE_THRESHOLD) {
      for (let i = 1; i < lines.length && result.length < maxLen; i++) {
        result += ' · ' + lines[i];
      }
    }

    if (result.length <= maxLen) return result;
    return result.substring(0, maxLen - 1) + '…';
  }
}
