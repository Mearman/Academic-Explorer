/**
 * Navigation tracker component that logs route changes and page visits
 */

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

        // Send page view to PostHog
        try {
          if (typeof window !== 'undefined' && 'posthog' in window) {
            const posthog = (window as any).posthog;
            if (posthog) {
              const eventProperties = {
                page_type: pageInfo.isEntityPage ? 'entity_detail' : 'search',
                entity_type: pageInfo.metadata.entityType || null,
                has_search_query: !!(pageInfo.metadata.searchQuery),
                has_filters: !!(pageInfo.metadata.filters),
                user_agent_group: getUserAgentGroup(),
                timestamp: new Date().toISOString(),
                path: location.pathname,
              };

              posthog.capture('page_view', eventProperties);
            }
          }
        } catch (analyticsError) {
          console.warn('Failed to send page view to PostHog:', analyticsError);
        }
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

/**
 * Get user agent group for analytics (privacy-friendly grouping)
 */
function getUserAgentGroup(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'other';
}

/**
 * Get entity category for analytics (privacy-safe grouping)
 */
function getEntityCategory(entityType: string): string {
  const workTypes = ['works'];
  const peopleTypes = ['authors'];
  const institutionTypes = ['institutions'];
  const publicationTypes = ['sources', 'publishers'];
  const researchTypes = ['topics', 'concepts'];
  const fundingTypes = ['funders'];
  const discoveryTypes = ['keywords'];

  if (workTypes.includes(entityType)) return 'academic_work';
  if (peopleTypes.includes(entityType)) return 'researcher';
  if (institutionTypes.includes(entityType)) return 'research_institution';
  if (publicationTypes.includes(entityType)) return 'publication_venue';
  if (researchTypes.includes(entityType)) return 'research_topic';
  if (fundingTypes.includes(entityType)) return 'funding_organization';
  if (discoveryTypes.includes(entityType)) return 'discovery_term';

  return 'other_entity';
}

/**
 * Get search category for analytics (privacy-safe grouping without revealing actual queries)
 */
function getSearchCategory(query: string): string {
  if (!query || typeof query !== 'string') return 'empty_search';

  const trimmed = query.trim();
  if (trimmed.length === 0) return 'empty_search';
  if (trimmed.length < 5) return 'short_search';
  if (trimmed.length < 10) return 'medium_search';
  if (trimmed.length < 20) return 'long_search';
  return 'very_long_search';
}
