/**
 * Collapsible section component for sidebar organization
 * Provides expandable sections with icons and state persistence using Mantine Accordion
 */

import React from "react";
import { Accordion } from "@mantine/core";
import { useLayoutStore } from "@/stores/layout-store";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  storageKey?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  storageKey,
}) => {
  const layoutStore = useLayoutStore();
  const { collapsedSections } = layoutStore;
  const { setSectionCollapsed } = layoutStore;

  // Get current expanded state from store or default (inverted from collapsed)
  const isExpanded = storageKey
    ? !(collapsedSections[storageKey] ?? !defaultExpanded)
    : defaultExpanded;

  const handleChange = () => {
    if (storageKey) {
      setSectionCollapsed({ sectionKey: storageKey, collapsed: isExpanded });
    }
  };

  return (
    <Accordion
      chevronPosition="right"
      variant="default"
      value={isExpanded ? storageKey || "default" : null}
      onChange={handleChange}
    >
      <Accordion.Item value={storageKey || "default"}>
        <Accordion.Control icon={icon}>
          {title}
        </Accordion.Control>
        <Accordion.Panel>
          {children}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
