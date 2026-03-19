import type { NavItem } from '@/shared/types';
import type { NavigationEngine } from '../engine/navigation';
import { SHADOW_HOST_ID, DRAG_THRESHOLD } from '@/shared/constants';
import { getThemeColors, applyTheme } from './theme';
import panelCSS from './panel.css?inline';

/** Inline SVG lifebuoy icon (brand mark) */
const BUOY_SVG = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>`;

/** Person silhouette icon — represents user messages */
const USER_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;

/** Sparkle icon — represents AI / assistant messages */
const SPARKLE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>`;

/**
 * NavigationPanel — Sidebar TOC (expanded) + FAB (collapsed).
 *
 * Two modes:
 * - EXPANDED: A compact TOC sidebar, draggable via header
 * - COLLAPSED: A floating ball at bottom-right; click to re-expand
 */
export class NavigationPanel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private rootEl!: HTMLElement;

  // Sidebar elements
  private sidebarEl!: HTMLElement;
  private listEl!: HTMLElement;
  private countEl!: HTMLElement;

  // FAB elements
  private fabEl!: HTMLButtonElement;
  private badgeEl!: HTMLElement;

  // State
  private unsubscribe: (() => void) | null = null;
  private collapsed = false;
  private currentItems: NavItem[] = [];
  private themeObserver: MutationObserver | null = null;

  // Drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartLeft = 0;
  private dragStartTop = 0;
  private hasDragged = false;

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

    // Header (also serves as the drag handle)
    const header = this.el('div', 'cb-header');
    const logo = this.el('span', 'cb-logo');
    logo.innerHTML = BUOY_SVG;
    const title = this.el('span', 'cb-title');
    title.textContent = 'Chat Buoy';
    const collapseBtn = this.el('button', 'cb-btn');
    collapseBtn.textContent = '−';
    collapseBtn.title = 'Minimize';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });
    header.append(logo, title, collapseBtn);

    // Drag support on header
    this.initDrag(header);

    // Navigation list
    this.listEl = this.el('div', 'cb-nav-list');

    // Footer (simplified: just turn count)
    const footer = this.el('div', 'cb-footer');
    this.countEl = this.el('span', 'cb-count');
    this.countEl.textContent = '0 turns';
    footer.appendChild(this.countEl);

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
  // Drag Logic
  // ================================================================

  private initDrag(handle: HTMLElement): void {
    handle.addEventListener('mousedown', (e: MouseEvent) => {
      // Only left-click
      if (e.button !== 0) return;
      // Don't start drag from button clicks
      if ((e.target as HTMLElement).closest('.cb-btn')) return;

      e.preventDefault();
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const rect = this.host.getBoundingClientRect();
      this.dragStartLeft = rect.left;
      this.dragStartTop = rect.top;

      this.host.classList.add('dragging');
      document.addEventListener('mousemove', this.onDragMove);
      document.addEventListener('mouseup', this.onDragEnd);
    });
  }

  private onDragMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (!this.hasDragged && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
      return; // Don't start drag until threshold is exceeded
    }
    this.hasDragged = true;

    const newLeft = this.dragStartLeft + dx;
    const newTop = this.dragStartTop + dy;

    // Clamp within viewport
    const maxLeft = window.innerWidth - 60;
    const maxTop = window.innerHeight - 40;
    const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(0, Math.min(newTop, maxTop));

    // Switch from right-based to left-based positioning
    this.host.style.right = 'auto';
    this.host.style.left = `${clampedLeft}px`;
    this.host.style.top = `${clampedTop}px`;
  };

  private onDragEnd = (): void => {
    this.isDragging = false;
    this.host.classList.remove('dragging');
    document.removeEventListener('mousemove', this.onDragMove);
    document.removeEventListener('mouseup', this.onDragEnd);
  };

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

    const total = this.currentItems.length;
    this.countEl.textContent = total === 1 ? '1 turn' : `${total} turns`;

    if (!this.collapsed) {
      this.scrollActiveIntoView();
    }
  }

  private createNavItem(item: NavItem, displayIndex: number): HTMLElement {
    const roleClass = item.role === 'user' ? 'role-user' : 'role-assistant';
    const activeClass = item.isActive ? ' active' : '';
    const el = this.el('div', `cb-nav-item ${roleClass}${activeClass}`);
    el.style.animationDelay = `${displayIndex * 0.025}s`;

    // Role icon
    const roleIcon = this.el('span', 'cb-role-icon');
    roleIcon.innerHTML = item.role === 'user' ? USER_SVG : SPARKLE_SVG;

    // Preview text
    const preview = this.el('span', 'cb-nav-preview');
    preview.textContent = item.preview;

    el.append(roleIcon, preview);

    el.addEventListener('click', () => {
      this.engine.scrollTo(item.id);
    });

    return el;
  }

  private updateBadge(): void {
    const count = this.currentItems.length;
    this.badgeEl.textContent = count > 99 ? '99+' : `${count}`;
    this.badgeEl.classList.toggle('visible', count > 0);
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
