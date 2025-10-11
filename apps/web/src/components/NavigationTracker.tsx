/**
 * Entity page tracker component that logs when entity pages are visited
 */

import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAppActivityStore } from "@/stores/app-activity-store";
import { EntityDetectionService } from "@academic-explorer/graph";

export function NavigationTracker() {
  const location = useLocation();
  const { addEvent } = useAppActivityStore();

  useEffect(() => {
    // Check if current location is an entity page or search page
    const pageInfo = extractPageInfo(
      location.pathname,
      location.search as Record<string, unknown>,
    );

    if (pageInfo) {
      // Log the page visit
      addEvent({
        type: "navigation",
        category: "ui",
        event: pageInfo.isEntityPage
          ? "entity_page_visit"
          : "search_page_visit",
        description: pageInfo.description,
        severity: "info",
        metadata: {
          ...pageInfo.metadata,
          route:
            location.pathname +
            (Object.keys(location.search).length > 0
              ? "?" +
                new URLSearchParams(
                  location.search as Record<string, string>,
                ).toString()
              : ""),
        },
      });
    }
  }, [location.pathname, location.search, addEvent]);

  // Helper function to extract page information from pathname and search
  const extractPageInfo = (
    pathname: string,
    search: Record<string, unknown>,
  ): {
    isEntityPage: boolean;
    description: string;
    metadata: Record<string, unknown>;
  } | null => {
    // Remove leading slash and split by /
    const parts = pathname.replace(/^\//, "").split("/");

    if (parts.length >= 1) {
      const pageType = parts[0];

      // Validate that this is a known entity type
      const validEntityTypes = [
        "works",
        "authors",
        "institutions",
        "concepts",
        "funders",
        "publishers",
        "sources",
        "topics",
        "keywords",
      ];

      // Handle entity pages and searches
      if (validEntityTypes.includes(pageType)) {
        if (parts.length >= 2 && parts[1]) {
          // Entity detail page
          const entityId = parts[1];
          const detection = EntityDetectionService.detectEntity(entityId);
          if (detection?.entityType) {
            return {
              isEntityPage: true,
              description: `Visited ${detection.entityType} page: ${detection.normalizedId}`,
              metadata: {
                entityType: detection.entityType,
                entityId: detection.normalizedId,
              },
            };
          }
        } else {
          // Search page for this entity type
          const query = (search.q as string) || (search.search as string) || "";
          const filters = Object.keys(search)
            .filter((key) => key !== "q" && key !== "search")
            .map((key) => `${key}:${search[key]}`)
            .join(", ");

          let description = `Searched ${pageType}`;
          if (query) description += ` for "${query}"`;
          if (filters) description += ` with filters: ${filters}`;

          return {
            isEntityPage: false,
            description,
            metadata: {
              entityType: pageType,
              searchQuery: query,
              filters: filters || undefined,
              searchParams: search,
            },
          };
        }
      }

      // Handle other search pages (autocomplete, text search, etc.)
      if (pageType === "autocomplete" || pageType === "text") {
        const query = (search.q as string) || (search.search as string) || "";
        const filters = Object.keys(search)
          .filter((key) => key !== "q" && key !== "search")
          .map((key) => `${key}:${search[key]}`)
          .join(", ");

        let description = `Searched ${pageType}`;
        if (query) description += ` for "${query}"`;
        if (filters) description += ` with filters: ${filters}`;

        return {
          isEntityPage: false,
          description,
          metadata: {
            pageType,
            searchQuery: query,
            filters: filters || undefined,
            searchParams: search,
          },
        };
      }
    }

    return null;
  };

  return null; // This component doesn't render anything
}
