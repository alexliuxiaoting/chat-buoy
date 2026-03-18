# Chat Buoy

> Navigate long AI conversations with a smart sidebar — like a table of contents for your chats.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green.svg)
![TypeScript](https://img.shields.io/badge/built%20with-TypeScript-3178C6.svg)

## The Problem

AI conversations get **long**. Really long. Scrolling through 50+ rounds of chat to find that one useful answer is painful. Chat Buoy adds a navigation sidebar that lets you jump to any part of the conversation instantly.

## Features

- 🗂️ **Auto-generated Table of Contents** — Every message becomes a clickable navigation item
- 🎯 **Role Differentiation** — User questions (purple dot, bold) and AI answers (green dot, subtle) are instantly distinguishable
- 📍 **Active Position Tracking** — Always know where you are in the conversation
- 📊 **Reading Progress** — Visual progress bar showing how far you've read
- 🎈 **Floating Ball Mode** — Minimize to a compact floating ball, expand back anytime
- 🎨 **Chameleon UI** — Automatically matches the host page's light/dark theme
- 🪶 **Lightweight** — Shadow DOM isolation, zero host page pollution
- ⚡ **Real-time** — New messages appear in the nav instantly (MutationObserver)
- 💡 **Smart Preview** — Short AI acknowledgments like "Sure!" are enriched with subsequent context

## Supported Platforms

| Platform | Status |
|----------|--------|
| ChatGPT  | ✅ Supported |
| Gemini   | 🔜 Coming soon |
| Claude   | 🔜 Coming soon |

## Installation

### From Source (Development)

```bash
# Clone the repo
git clone https://github.com/user/chat-buoy.git
cd chat-buoy

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

Then load the extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` folder in the project directory

### Build for Production

```bash
npm run build
```

The built extension will be in the `dist/` folder.

## Architecture

Chat Buoy is built with a clean, extensible architecture:

```
Content Script
├── Adapter Layer    ← Platform-specific DOM parsing (ChatGPT, Gemini, ...)
├── Engine Layer     ← MutationObserver + IntersectionObserver + state management
└── UI Layer         ← Shadow DOM sidebar + floating ball (zero CSS pollution)
```

**Adding a new platform** is as simple as creating a new adapter file:

```typescript
// src/content/adapters/my-platform.adapter.ts
export class MyPlatformAdapter implements SiteAdapter {
  match(url: string): boolean { /* ... */ }
  getScrollContainer(): Element | null { /* ... */ }
  queryMessageElements(): Element[] { /* ... */ }
  parseMessage(element: Element, index: number): ParsedMessage | null { /* ... */ }
  getTheme(): 'light' | 'dark' { /* ... */ }
}
```

Then register it in `src/content/adapters/registry.ts`.

## Tech Stack

- **TypeScript** — Type safety
- **Vite** — Fast builds with Chrome Extension support
- **Shadow DOM** — Style isolation from host pages
- **MutationObserver** — Efficient DOM change detection
- **IntersectionObserver** — Viewport visibility tracking

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

The easiest way to contribute is to **add support for a new AI platform** by creating a new adapter.

## License

[MIT](LICENSE) — use it however you like.
