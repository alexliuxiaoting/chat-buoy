/**
 * Theme detection and CSS variable injection.
 *
 * Chat Buoy auto-adapts to the host page's theme (chameleon UI).
 * We read the host theme and inject matching CSS custom properties
 * into our Shadow DOM.
 */

export interface ThemeColors {
  bg: string;
  bgHover: string;
  bgActive: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  green: string;
  scrollbar: string;
  scrollbarHover: string;
  shadow: string;
  fabBg: string;
  fabShadow: string;
}

const LIGHT_THEME: ThemeColors = {
  bg: 'rgba(255, 255, 255, 0.92)',
  bgHover: 'rgba(0, 0, 0, 0.04)',
  bgActive: 'rgba(99, 102, 241, 0.10)',
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  border: 'rgba(0, 0, 0, 0.08)',
  accent: '#6366f1',
  green: '#10b981',
  scrollbar: 'rgba(0, 0, 0, 0.12)',
  scrollbarHover: 'rgba(0, 0, 0, 0.24)',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
  fabBg: 'rgba(255, 255, 255, 0.95)',
  fabShadow: '0 4px 16px rgba(99, 102, 241, 0.25), 0 2px 6px rgba(0, 0, 0, 0.08)',
};

const DARK_THEME: ThemeColors = {
  bg: 'rgba(32, 33, 36, 0.92)',
  bgHover: 'rgba(255, 255, 255, 0.06)',
  bgActive: 'rgba(129, 140, 248, 0.14)',
  text: '#e8eaed',
  textSecondary: '#9aa0a6',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#818cf8',
  green: '#34d399',
  scrollbar: 'rgba(255, 255, 255, 0.12)',
  scrollbarHover: 'rgba(255, 255, 255, 0.24)',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.32), 0 1px 4px rgba(0, 0, 0, 0.16)',
  fabBg: 'rgba(40, 42, 48, 0.95)',
  fabShadow: '0 4px 16px rgba(129, 140, 248, 0.30), 0 2px 6px rgba(0, 0, 0, 0.20)',
};

export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

/** Apply theme as CSS custom properties on a target element */
export function applyTheme(
  target: HTMLElement,
  colors: ThemeColors
): void {
  target.style.setProperty('--cb-bg', colors.bg);
  target.style.setProperty('--cb-bg-hover', colors.bgHover);
  target.style.setProperty('--cb-bg-active', colors.bgActive);
  target.style.setProperty('--cb-text', colors.text);
  target.style.setProperty('--cb-text-secondary', colors.textSecondary);
  target.style.setProperty('--cb-border', colors.border);
  target.style.setProperty('--cb-accent', colors.accent);
  target.style.setProperty('--cb-green', colors.green);
  target.style.setProperty('--cb-scrollbar', colors.scrollbar);
  target.style.setProperty('--cb-scrollbar-hover', colors.scrollbarHover);
  target.style.setProperty('--cb-shadow', colors.shadow);
  target.style.setProperty('--cb-fab-bg', colors.fabBg);
  target.style.setProperty('--cb-fab-shadow', colors.fabShadow);
}
