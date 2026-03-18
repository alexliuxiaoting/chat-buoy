import type { SiteAdapter } from './adapter.interface';
import { ChatGPTAdapter } from './chatgpt.adapter';

/**
 * Registry of all site adapters.
 * Adding a new platform = import + push to this array.
 */
const adapters: SiteAdapter[] = [
  new ChatGPTAdapter(),
  // Future: new GeminiAdapter(),
  // Future: new ClaudeAdapter(),
];

/**
 * Find the adapter that matches the current page URL.
 * Returns undefined if no adapter matches (extension stays dormant).
 */
export function resolveAdapter(url: string): SiteAdapter | undefined {
  return adapters.find((adapter) => adapter.match(url));
}
