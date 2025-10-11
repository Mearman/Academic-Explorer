/**
 * Navigation tracker component that logs route changes and page visits
 */

import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAppActivityStore } from "@/stores/app-activity-store";
import { EntityDetectionService } from "@academic-explorer/graph";

export function NavigationTracker() {
  const location = useLocation();
  const { logNavigation, addEvent } = useAppActivityStore();
  const previousLocationRef = useRef<string | null>(null);

  // Log that the tracker is mounted
  useEffect(() => {
    console.log("NavigationTracker: Component mounted");
    addEvent({
      type: "component",
      category: "lifecycle",
      event: "mount",
      description: "NavigationTracker component mounted",
      severity: "debug",
    });
  }, []);

  useEffect(() => {
    console.log("NavigationTracker: useEffect running", {
      pathname: location.pathname,
      search: location.search,
    });
    const currentLocation =
      location.pathname +
      (Object.keys(location.search).length > 0
        ? "?" +
          new URLSearchParams(
            location.search as Record<string, string>,
          ).toString()
        : "");

    // Always log page visits with detailed metadata
    const pageInfo = extractPageInfo(
      location.pathname,
      location.search as Record<string, unknown>,
    );

    if (pageInfo) {
      console.log("NavigationTracker: Logging page visit", pageInfo);
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
          route: currentLocation,
        },
      });
    }

    // Log navigation if there's a previous location
    if (
      previousLocationRef.current &&
      previousLocationRef.current !== currentLocation
    ) {
      console.log("NavigationTracker: Location changed", {
        from: previousLocationRef.current,
        to: currentLocation,
      });

      logNavigation(previousLocationRef.current, currentLocation, {
        searchParams:
          Object.keys(location.search).length > 0 ? location.search : undefined,
        ...(pageInfo?.metadata || {}),
      });
    }

    // Update previous location
    previousLocationRef.current = currentLocation;
  }, [location.pathname, location.search]);

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
              searchParams:
                Object.keys(search).length > 0
                  ? new URLSearchParams(
                      search as Record<string, string>,
                    ).toString()
                  : undefined,
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
