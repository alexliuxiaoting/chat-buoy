# Contributing to Chat Buoy 🛟

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/alexliuxiaoting/chat-buoy.git
cd chat-buoy
npm install
npm run dev
```

Load the `dist` folder as an unpacked extension in `chrome://extensions/`.

## Adding a New Platform Adapter

This is the most impactful way to contribute! Each AI platform has its own adapter in `src/content/adapters/`.

1. Create `src/content/adapters/your-platform.adapter.ts`
2. Implement the `SiteAdapter` interface
3. Register it in `src/content/adapters/registry.ts`
4. Add the platform's URL to `src/manifest.json` under `content_scripts.matches`
5. Test it on a real conversation

### SiteAdapter Interface

```typescript
interface SiteAdapter {
  readonly name: string;
  match(url: string): boolean;
  getScrollContainer(): Element | null;
  queryMessageElements(): Element[];
  parseMessage(element: Element, index: number): ParsedMessage | null;
  getTheme(): 'light' | 'dark';
}
```

**Tips:**
- Use the browser DevTools to inspect the chat's DOM structure
- Add multiple CSS selector fallbacks for resilience
- Test with both short and very long (100+) conversations

## Code Style

- TypeScript strict mode
- Descriptive variable names
- Comments for non-obvious logic
- English comments and documentation

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/gemini-adapter`)
3. Commit your changes
4. Push and open a PR

## Reporting Issues

Please include:
- Browser version
- Which AI platform / URL
- Steps to reproduce
- Screenshots if applicable
