/**
 * Section registry for sidebar sections
 * Centralizes section definitions and provides lookup utilities
 */

import React from "react";
import {
	IconSearch,
	IconFilter,
	IconGraph,
	IconDatabase,
	IconLink,
	IconInfoCircle,
	IconExternalLink,
	IconStar,
	IconEye,
	IconUsers,
} from "@tabler/icons-react";
import type { SidebarSection } from "@/types/sidebar-sections";

// Lazy-loaded section components
const SearchSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.SearchSection })));
const EntityFiltersSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.EntityFiltersSection })));
const GraphActionsSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.GraphActionsSection })));
const CacheSettingsSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.CacheSettingsSection })));
const EdgeFiltersSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.EdgeFiltersSection })));
const EntityInfoSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.EntityInfoSection })));
const ExternalLinksSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.ExternalLinksSection })));
const ViewOptionsSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.ViewOptionsSection })));
const RawApiDataSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.RawApiDataSection })));
const GraphStatsSection = React.lazy(() => import("@/components/sections").then(m => ({ default: m.GraphStatsSection })));

/**
 * Registry of all available sidebar sections
 */
export const SECTION_DEFINITIONS: ReadonlyArray<SidebarSection> = [
	// Left sidebar sections (default)
	{
		id: "search",
		title: "Search Academic Entities",
		icon: IconSearch,
		component: SearchSection,
		defaultSidebar: "left",
		category: "data-input",
		order: 1,
		tooltip: "Search academic entities",
	},
	{
		id: "entity-filters",
		title: "Entity Types & Visibility",
		icon: IconFilter,
		component: EntityFiltersSection,
		defaultSidebar: "left",
		category: "filtering",
		order: 2,
		tooltip: "Entity & edge filters",
	},
	{
		id: "graph-actions",
		title: "Graph Actions",
		icon: IconGraph,
		component: GraphActionsSection,
		defaultSidebar: "left",
		category: "graph-control",
		order: 3,
		tooltip: "Graph layout controls",
	},
	{
		id: "cache-settings",
		title: "Cache & Traversal Settings",
		icon: IconDatabase,
		component: CacheSettingsSection,
		defaultSidebar: "left",
		category: "graph-control",
		order: 4,
		tooltip: "Cache & traversal settings",
	},
	{
		id: "edge-filters",
		title: "Edge Types & Visibility",
		icon: IconLink,
		component: EdgeFiltersSection,
		defaultSidebar: "left",
		category: "filtering",
		order: 5,
		tooltip: "Edge types & visibility",
	},

	// Right sidebar sections (default)
	{
		id: "entity-info",
		title: "Entity Information",
		icon: IconInfoCircle,
		component: EntityInfoSection,
		defaultSidebar: "right",
		category: "entity-details",
		order: 1,
		tooltip: "Entity details",
	},
	{
		id: "external-links",
		title: "External Links",
		icon: IconExternalLink,
		component: ExternalLinksSection,
		defaultSidebar: "right",
		category: "entity-details",
		order: 2,
		tooltip: "External links",
	},
	{
		id: "view-options",
		title: "View Options",
		icon: IconStar,
		component: ViewOptionsSection,
		defaultSidebar: "right",
		category: "view-control",
		order: 3,
		tooltip: "View options",
	},
	{
		id: "raw-api-data",
		title: "Raw API Data",
		icon: IconEye,
		component: RawApiDataSection,
		defaultSidebar: "right",
		category: "debugging",
		order: 4,
		tooltip: "Raw API data",
	},
	{
		id: "graph-stats",
		title: "Graph Statistics",
		icon: IconUsers,
		component: GraphStatsSection,
		defaultSidebar: "right",
		category: "analysis",
		order: 5,
		tooltip: "Graph statistics",
	},
] as const;

/**
 * Map of section ID to section definition for fast lookup
 */
export const SECTIONS_BY_ID = new Map(
	SECTION_DEFINITIONS.map(section => [section.id, section])
);

/**
 * Get section definition by ID
 */
export const getSectionById = (id: string): SidebarSection | undefined => {
	return SECTIONS_BY_ID.get(id);
};

/**
 * Get all section IDs
 */
export const getAllSectionIds = (): string[] => {
	return SECTION_DEFINITIONS.map(section => section.id);
};

/**
 * Get sections by category
 */
export const getSectionsByCategory = (category: string): SidebarSection[] => {
	return SECTION_DEFINITIONS.filter(section => section.category === category);
};

/**
 * Get default section placements for new installations
 */
export const getDefaultSectionPlacements = (): Record<string, "left" | "right"> => {
	const placements: Record<string, "left" | "right"> = {};

	for (const section of SECTION_DEFINITIONS) {
		placements[section.id] = section.defaultSidebar;
	}

	return placements;
};

/**
 * Get sections sorted by order within their category
 */
export const getSectionsSorted = (sections: SidebarSection[]): SidebarSection[] => {
	return [...sections].sort((a, b) => {
		// Sort by category first, then by order
		if (a.category !== b.category) {
			return (a.category || "").localeCompare(b.category || "");
		}
		return (a.order || 0) - (b.order || 0);
	});
};