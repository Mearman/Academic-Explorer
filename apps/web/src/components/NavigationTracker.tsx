/**
 * Navigation tracker component that logs route changes and page visits
 */

import { historyDB } from "@/lib/history-db";
import { useAppActivityStore } from "@/stores/app-activity-store";
import { EntityDetectionService } from "@academic-explorer/graph";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useMemo } from "react";
import { decodeEntityId } from "@/utils/url-decoding";
import { logger } from "@/lib/logger";

export function NavigationTracker() {
  const location = useLocation();
  const { logNavigation, addEvent } = useAppActivityStore();
  const previousLocationRef = useRef<string | null>(null);

  // Log that the tracker is mounted
  useEffect(() => {
    addEvent({
      type: "component",
      category: "lifecycle",
      event: "mount",
      description: "NavigationTracker component mounted",
      severity: "debug",
    });
  }, [addEvent]);

  // Memoize pageInfo extraction to prevent excessive re-computation
  const extractPageInfoMemoized = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof extractPageInfo>>();

    return (pathname: string, search: Record<string, unknown>) => {
      const key = `${pathname}|${JSON.stringify(search)}`;
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = extractPageInfo(pathname, search);
      cache.set(key, result);

      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      return result;
    };
  }, []);

  useEffect(() => {
    const currentLocation = location.pathname + location.search + location.hash;

    // Debounce heavy operations to prevent excessive calls
    const timeoutId = setTimeout(() => {
      // Add visit to history database (normalized routes)
      historyDB.addVisit({
        path: location.pathname,
        search: location.search.toString(),
        hash: location.hash,
      }).catch((error) => {
        // Silently handle database errors to prevent crashes
        logger.warn("storage", "Failed to add visit to history", { error });
      });

      // Extract page information with memoization
      const pageInfo = extractPageInfoMemoized(
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
            route: currentLocation,
          },
        });
      }

      // Log navigation if there's a previous location
      if (
        previousLocationRef.current &&
        previousLocationRef.current !== currentLocation
      ) {
        logNavigation(previousLocationRef.current, currentLocation, {
          searchParams: location.search || undefined,
          ...(pageInfo?.metadata || {}),
        });
      }
    }, 100); // 100ms debounce

    // Update previous location immediately
    previousLocationRef.current = currentLocation;

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, location.hash, addEvent, logNavigation, extractPageInfoMemoized]);

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
          // Decode and fix the entity ID (handles URL encoding and collapsed protocol slashes)
          const entityId = decodeEntityId(parts[1]);
          if (!entityId) return null;

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
