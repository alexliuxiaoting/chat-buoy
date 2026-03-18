/** Extension-wide constants */

export const EXTENSION_NAME = 'Chat Buoy';
export const SHADOW_HOST_ID = 'chat-buoy-root';
export const PREVIEW_MAX_LENGTH = 80;

/** FAB (Floating Action Button) */
export const FAB_SIZE = 48;
export const FAB_DEFAULT_BOTTOM = 24;
export const FAB_DEFAULT_RIGHT = 24;

/** Popup panel dimensions */
export const POPUP_WIDTH = 320;
export const POPUP_MAX_HEIGHT = 480;

/** Drag vs click threshold (pixels) */
export const DRAG_THRESHOLD = 5;

/** Debounce delay for MutationObserver callbacks (ms) */
export const MUTATION_DEBOUNCE_MS = 150;

/** IntersectionObserver threshold for "active" detection */
export const INTERSECTION_THRESHOLD = 0.3;

/** Smooth scroll behavior config */
export const SCROLL_BEHAVIOR: ScrollIntoViewOptions = {
  behavior: 'smooth',
  block: 'start',
};
