import { HistorySidebar } from "./HistorySidebar";
import { EntityInfoSection } from "../sections/EntityInfoSection";
import { useLayoutState } from "@/stores/layout-store";

/**
 * Right sidebar dynamic component - shows entity preview or navigation history
 * When an entity is clicked in the relationship section or graph, displays EntityInfoSection
 * Otherwise shows HistorySidebar
 */
export function RightSidebarDynamic() {
  const { previewEntityId } = useLayoutState();

  // Show entity preview if available, otherwise show history
  if (previewEntityId) {
    return <EntityInfoSection />;
  }

  return <HistorySidebar />;
}