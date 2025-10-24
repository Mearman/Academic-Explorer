/**
 * Type definitions for sidebar section system
 * Supports VSCode-style draggable sections between sidebars
 */

import type { ComponentType } from "react";

export interface SidebarSection {
  /** Unique identifier for the section */
  id: string;
  /** Display name shown in UI */
  title: string;
  /** Icon component to display in ribbon */
  icon: ComponentType<{ size?: number }>;
  /** Component to render in sidebar when section is active */
  component: ComponentType;
  /** Default sidebar placement for new installations */
  defaultSidebar: "left" | "right";
  /** Optional category for grouping */
  category?: string;
  /** Sort order within sidebar (lower numbers first) */
  order?: number;
  /** Optional tooltip text */
  tooltip?: string;
}
