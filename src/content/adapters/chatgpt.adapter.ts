import type { SiteAdapter } from './adapter.interface';
import type { ParsedMessage } from '@/shared/types';
import { PREVIEW_MAX_LENGTH } from '@/shared/constants';

/**
 * ChatGPT Adapter
 *
 * Handles DOM parsing for chatgpt.com and chat.openai.com.
 * ChatGPT renders conversations as a series of turn sections,
 * each containing one or more user/assistant sub-messages.
 *
 * DOM Structure (as of 2026-03):
 *   <div data-scroll-root> (scroll container)
 *     <section data-testid="conversation-turn-N" data-turn="user|assistant">
 *       <div data-message-author-role="user|assistant" data-message-id="...">
 *         <div class="markdown ...">...prose content...</div>
 *       </div>
 *       <!-- assistant turns may have multiple sub-messages -->
 *     </section>
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
      document.querySelector('[data-scroll-root]') ??
      document.querySelector('main div.overflow-y-auto') ??
      document.querySelector('main [class*="react-scroll-to-bottom"]') ??
      document.querySelector('main')
    );
  }

  queryMessageElements(): Element[] {
    // Each conversation turn is a <section> (or <article> in older versions)
    // with data-testid. A single turn may contain multiple sub-messages
    // (tool calls, streaming steps, etc.), but we always treat the turn
    // as the atomic unit to avoid splitting one reply into many items.
    const turns = document.querySelectorAll(
      '[data-testid^="conversation-turn-"]'
    );
    if (turns.length > 0) {
      return Array.from(turns);
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
    // Prefer the data-turn attribute on the <section> element itself
    const turnAttr = element.getAttribute('data-turn');
    if (turnAttr === 'user') return 'user';
    if (turnAttr === 'assistant') return 'assistant';

    // Check data-message-author-role on self
    const selfRole = element.getAttribute('data-message-author-role');
    if (selfRole === 'user') return 'user';
    if (selfRole === 'assistant') return 'assistant';

    // A turn may contain multiple sub-messages (e.g. tool calls).
    // Scan all children with a role attribute and pick the dominant one.
    const children = element.querySelectorAll('[data-message-author-role]');
    if (children.length > 0) {
      for (const child of children) {
        const r = child.getAttribute('data-message-author-role');
        if (r === 'user') return 'user';
      }
      return 'assistant';
    }

    return null;
  }

  private extractText(element: Element): string {
    // Collect text from ALL prose sub-elements within the turn.
    // A single turn can have multiple .markdown / .whitespace-pre-wrap
    // blocks (e.g. multi-step AI replies with tool calls).
    const proseEls = element.querySelectorAll(
      '.markdown, .whitespace-pre-wrap'
    );

    if (proseEls.length > 0) {
      const parts: string[] = [];
      for (const el of proseEls) {
        const t = (el.textContent ?? '').trim();
        if (t) parts.push(t);
      }
      return parts.join(' ');
    }

    // Fallback: grab the first child with role, or the element itself
    const roleEl = element.querySelector('[data-message-author-role] + div');
    const target = roleEl ?? element;
    return (target.textContent ?? '').trim();
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
