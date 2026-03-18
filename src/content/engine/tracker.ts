import { INTERSECTION_THRESHOLD } from '@/shared/constants';

/**
 * VisibilityTracker — uses IntersectionObserver to track which
 * message elements are currently visible in the viewport.
 *
 * This powers the "current position" highlight in the navigation panel.
 */
export class VisibilityTracker {
  private observer: IntersectionObserver | null = null;
  private visibleElements = new Set<Element>();

  constructor(
    private onVisibilityChange: (visibleElements: Set<Element>) => void
  ) {}

  /**
   * Start tracking visibility of the given elements.
   * The root is the scroll container (or null for viewport).
   */
  start(root: Element | null): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!this.visibleElements.has(entry.target)) {
              this.visibleElements.add(entry.target);
              changed = true;
            }
          } else {
            if (this.visibleElements.has(entry.target)) {
              this.visibleElements.delete(entry.target);
              changed = true;
            }
          }
        }

        if (changed) {
          this.onVisibilityChange(new Set(this.visibleElements));
        }
      },
      {
        root,
        threshold: INTERSECTION_THRESHOLD,
      }
    );
  }

  /** Observe a new element */
  observe(element: Element): void {
    this.observer?.observe(element);
  }

  /** Stop observing an element */
  unobserve(element: Element): void {
    this.observer?.unobserve(element);
  }

  /** Replace all observed elements with a new set */
  replaceAll(elements: Element[]): void {
    // Disconnect all existing observations
    this.visibleElements.clear();
    this.observer?.disconnect();

    // Re-start observer with same options, then observe all new elements
    for (const el of elements) {
      this.observer?.observe(el);
    }
  }

  /** Full teardown */
  disconnect(): void {
    this.visibleElements.clear();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
