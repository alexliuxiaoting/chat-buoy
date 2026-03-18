/** Role of the message sender */
export type MessageRole = 'user' | 'assistant';

/** A parsed message extracted from the chat DOM */
export interface ParsedMessage {
  /** Unique identifier (based on DOM position or data attribute) */
  id: string;
  /** Who sent this message */
  role: MessageRole;
  /** Short preview text for the navigation item (first ~80 chars) */
  preview: string;
  /** Reference to the original DOM element for scroll targeting */
  element: Element;
  /** 0-based index in the conversation */
  index: number;
}

/** Navigation item state (extends ParsedMessage with UI state) */
export interface NavItem extends ParsedMessage {
  /** Whether this item is currently visible in the viewport */
  isActive: boolean;
}

/** Extension settings persisted to chrome.storage */
export interface Settings {
  /** Whether the panel is collapsed */
  collapsed: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Show assistant messages in navigation */
  showAssistantMessages: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  collapsed: false,
  panelWidth: 280,
  showAssistantMessages: true,
};
