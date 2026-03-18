import type { NavItem } from '@/shared/types';
import type { NavigationEngine } from '../engine/navigation';
import { SHADOW_HOST_ID } from '@/shared/constants';
import { getThemeColors, applyTheme } from './theme';
import panelCSS from './panel.css?inline';

/** Inline SVG lifebuoy icon (renders on all platforms, unlike 🛟 emoji) */
const BUOY_SVG = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>`;

/**
 * NavigationPanel — Sidebar TOC (expanded) + FAB (collapsed).
 *
 * Two modes:
 * - EXPANDED: A compact TOC sidebar at the top-right of the page
 * - COLLAPSED: A floating ball at the bottom-right; click to re-expand
 *
 * The panel acts like a persistent table of contents that the user
 * can minimize when they want more screen space.
 */
export class NavigationPanel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private rootEl!: HTMLElement;

  // Sidebar elements
  private sidebarEl!: HTMLElement;
  private listEl!: HTMLElement;
  private progressFill!: HTMLElement;
  private progressText!: HTMLElement;
  private countEl!: HTMLElement;

  // FAB elements
  private fabEl!: HTMLButtonElement;
  private badgeEl!: HTMLElement;

  // State
  private unsubscribe: (() => void) | null = null;
  private collapsed = false;
  private currentItems: NavItem[] = [];
  private themeObserver: MutationObserver | null = null;
  private lastClickedPos = -1;  // tracks clicked nav position for progress

  constructor(
    private engine: NavigationEngine,
    private getTheme: () => 'light' | 'dark'
  ) {
    this.host = document.createElement('div');
    this.host.id = SHADOW_HOST_ID;
    this.shadow = this.host.attachShadow({ mode: 'closed' });
  }

  /** Mount the panel to the page */
  mount(): void {
    const existing = document.getElementById(SHADOW_HOST_ID);
    if (existing) existing.remove();

    this.buildDOM();
    this.updateTheme();
    document.body.appendChild(this.host);

    // Subscribe to navigation updates
    this.unsubscribe = this.engine.subscribe((items) => {
      this.currentItems = items;
      this.renderItems();
      this.updateBadge();
    });

    // Watch for theme changes on <html>
    this.themeObserver = new MutationObserver(() => this.updateTheme());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    });
  }

  /** Remove the panel from the page */
  unmount(): void {
    this.unsubscribe?.();
    this.themeObserver?.disconnect();
    this.host.remove();
  }

  // ================================================================
  // DOM Construction
  // ================================================================

  private buildDOM(): void {
    const style = document.createElement('style');
    style.textContent = panelCSS;

    this.rootEl = this.el('div', 'cb-root');

    this.buildSidebar();
    this.buildFAB();

    this.rootEl.append(this.sidebarEl, this.fabEl);
    this.shadow.append(style, this.rootEl);
  }

  private buildSidebar(): void {
    this.sidebarEl = this.el('div', 'cb-sidebar');

    // Header
    const header = this.el('div', 'cb-header');
    const logo = this.el('span', 'cb-logo');
    logo.innerHTML = BUOY_SVG;
    const title = this.el('span', 'cb-title');
    title.textContent = 'Chat Buoy';
    const collapseBtn = this.el('button', 'cb-btn');
    collapseBtn.textContent = '−';
    collapseBtn.title = 'Minimize to floating ball';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });
    header.append(logo, title, collapseBtn);

    // Navigation list
    this.listEl = this.el('div', 'cb-nav-list');

    // Footer
    const footer = this.el('div', 'cb-footer');
    const progress = this.el('div', 'cb-progress');
    const progressBar = this.el('div', 'cb-progress-bar');
    this.progressFill = this.el('div', 'cb-progress-fill');
    this.progressFill.style.width = '0%';
    progressBar.appendChild(this.progressFill);
    this.progressText = this.el('span', 'cb-progress-text');
    this.progressText.textContent = '0%';
    progress.append(progressBar, this.progressText);
    this.countEl = this.el('span', 'cb-count');
    this.countEl.textContent = '0';
    footer.append(progress, this.countEl);

    this.sidebarEl.append(header, this.listEl, footer);
  }

  private buildFAB(): void {
    this.fabEl = document.createElement('button');
    this.fabEl.className = 'cb-fab';
    this.fabEl.innerHTML = BUOY_SVG;

    this.badgeEl = this.el('span', 'cb-fab-badge');
    this.badgeEl.textContent = '0';
    this.fabEl.appendChild(this.badgeEl);

    this.fabEl.addEventListener('click', () => {
      this.expand();
    });
  }

  // ================================================================
  // Collapse / Expand
  // ================================================================

  private collapse(): void {
    this.collapsed = true;
    this.host.classList.add('collapsed');
  }

  private expand(): void {
    this.collapsed = false;
    this.host.classList.remove('collapsed');
    // Re-render and scroll to active
    this.renderItems();
  }

  // ================================================================
  // Rendering
  // ================================================================

  private renderItems(): void {
    const items = this.currentItems;

    this.listEl.innerHTML = '';

    if (items.length === 0) {
      const empty = this.el('div', 'cb-empty');
      const icon = this.el('div', 'cb-empty-icon');
      icon.innerHTML = BUOY_SVG;
      const text = this.el('div', 'cb-empty-text');
      text.textContent = 'Start a conversation to see navigation';
      empty.append(icon, text);
      this.listEl.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      items.forEach((item, i) => {
        const el = this.createNavItem(item, i);
        fragment.appendChild(el);
      });
      this.listEl.appendChild(fragment);
    }

    this.updateProgress(items);
    this.countEl.textContent = `${this.currentItems.length}`;

    if (!this.collapsed) {
      this.scrollActiveIntoView();
    }
  }

  private createNavItem(item: NavItem, displayIndex: number): HTMLElement {
    const roleClass = item.role === 'user' ? 'role-user' : 'role-assistant';
    const activeClass = item.isActive ? ' active' : '';
    const el = this.el('div', `cb-nav-item ${roleClass}${activeClass}`);
    el.style.animationDelay = `${displayIndex * 0.025}s`;

    // Role dot
    const roleDot = this.el('span', `cb-role-dot ${item.role}`);

    // Index badge
    const indexBadge = this.el('span', 'cb-nav-index');
    indexBadge.textContent = `${item.index + 1}`;

    // Preview text
    const preview = this.el('span', 'cb-nav-preview');
    preview.textContent = item.preview;

    el.append(roleDot, indexBadge, preview);

    el.addEventListener('click', () => {
      // Track the clicked position for immediate progress update
      const pos = this.currentItems.findIndex((ci) => ci.id === item.id);
      if (pos >= 0) this.lastClickedPos = pos;
      this.engine.scrollTo(item.id);
      // Immediately refresh progress
      this.updateProgress(this.currentItems);
    });

    return el;
  }

  private updateBadge(): void {
    const count = this.currentItems.length;
    this.badgeEl.textContent = count > 99 ? '99+' : `${count}`;
    this.badgeEl.classList.toggle('visible', count > 0);
  }

  private updateProgress(visibleItems: NavItem[]): void {
    const total = this.currentItems.length;
    if (total === 0) {
      this.progressFill.style.width = '0%';
      this.progressText.textContent = '0%';
      return;
    }

    // Find the furthest-down active item by its position within currentItems
    const activeIds = new Set(
      visibleItems.filter((i) => i.isActive).map((i) => i.id)
    );

    let maxPos = this.lastClickedPos;  // start from last clicked position
    for (let i = 0; i < this.currentItems.length; i++) {
      if (activeIds.has(this.currentItems[i].id) && i > maxPos) {
        maxPos = i;
      }
    }

    let progress = 0;
    if (maxPos >= 0) {
      progress = Math.round(((maxPos + 1) / total) * 100);
    }

    this.progressFill.style.width = `${progress}%`;
    this.progressText.textContent = `${progress}%`;
  }

  private scrollActiveIntoView(): void {
    const activeEl = this.listEl.querySelector('.cb-nav-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ================================================================
  // Theme
  // ================================================================

  private updateTheme(): void {
    const theme = this.getTheme();
    const colors = getThemeColors(theme);
    applyTheme(this.rootEl, colors);
  }

  // ================================================================
  // Helpers
  // ================================================================

  private el(tag: string, className: string): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
}
