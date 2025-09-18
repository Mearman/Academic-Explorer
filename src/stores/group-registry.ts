/**
 * Group registry for VSCode-style tool groups
 * Maps categories to group definitions with icons and descriptions
 */

import {
	IconSearch,
	IconFilter,
	IconGraph,
	IconInfoCircle,
	IconEye,
	IconChartBar,
	IconSettings,
} from "@tabler/icons-react";

export interface ToolGroupDefinition {
	id: string;
	title: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	description: string;
	category: string;
	order?: number; // For ordering in ribbons (lower numbers appear first)
}

// Version counter to track changes for React re-renders
let registryVersion = 0;

export const getRegistryVersion = (): number => registryVersion;

/**
 * Tool group definitions mapped by category
 * This is mutable to allow dynamic registration of new groups
 */
export const GROUP_DEFINITIONS: Record<string, ToolGroupDefinition> = {
	"data-input": {
		id: "data-input",
		title: "Search & Input",
		icon: IconSearch,
		description: "Search and input academic data",
		category: "data-input",
		order: 1,
	},
	"filtering": {
		id: "filtering",
		title: "Filters",
		icon: IconFilter,
		description: "Filter entities and edges",
		category: "filtering",
		order: 2,
	},
	"graph-control": {
		id: "graph-control",
		title: "Graph Control",
		icon: IconGraph,
		description: "Graph layout and control",
		category: "graph-control",
		order: 3,
	},
	"entity-details": {
		id: "entity-details",
		title: "Entity Details",
		icon: IconInfoCircle,
		description: "Entity information and links",
		category: "entity-details",
		order: 4,
	},
	"view-control": {
		id: "view-control",
		title: "View Options",
		icon: IconEye,
		description: "View and display options",
		category: "view-control",
		order: 5,
	},
	"debugging": {
		id: "debugging",
		title: "Debug Tools",
		icon: IconEye,
		description: "Debugging and inspection",
		category: "debugging",
		order: 6,
	},
	"analysis": {
		id: "analysis",
		title: "Analysis",
		icon: IconChartBar,
		description: "Graph analysis and statistics",
		category: "analysis",
		order: 7,
	},
	"settings": {
		id: "settings",
		title: "Settings",
		icon: IconSettings,
		description: "User preferences and data management",
		category: "settings",
		order: 8,
	},
};

/**
 * Register a new group definition dynamically
 */
export const registerGroupDefinition = (groupDefinition: ToolGroupDefinition): void => {
	GROUP_DEFINITIONS[groupDefinition.id] = groupDefinition;
	registryVersion++; // Increment version to trigger re-renders
};

/**
 * Create and register a new group with a primary section
 */
export const createNewGroup = (_primarySectionId: string): ToolGroupDefinition => {
	// Generate a unique group ID
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	const groupId = `group_${timestamp.toString()}_${random}`;

	// We'll update the definition dynamically when sections change
	// For now, create a placeholder
	const newDefinition: ToolGroupDefinition = {
		id: groupId,
		title: "New Group",
		icon: GROUP_DEFINITIONS["data-input"].icon, // Placeholder icon
		description: "Dynamic group",
		category: "dynamic",
	};

	registerGroupDefinition(newDefinition);
	return newDefinition;
};

/**
 * Get the next available order number (for placing new groups at the end)
 */
const getNextOrderNumber = (): number => {
	const maxOrder = Math.max(...Object.values(GROUP_DEFINITIONS).map(def => def.order || 0));
	return maxOrder + 1;
};

/**
 * Update a group's definition based on its current sections
 * Note: This function will be called from the layout store after sections change
 */
import type { SidebarSection } from "@/types/sidebar-sections";

export const updateGroupDefinition = (groupId: string, sections: string[], getSectionById: (id: string) => SidebarSection | undefined): void => {
	if (sections.length === 0) {
		// Skip empty groups - they will be filtered out when needed
		return;
	}

	// Get the first (topmost) section to determine group properties
	const primarySection = getSectionById(sections[0]);
	if (!primarySection) return;

	// Preserve existing order if group already exists, otherwise assign new order
	const existingDefinition = GROUP_DEFINITIONS[groupId];
	const order = existingDefinition.order ?? getNextOrderNumber();

	// Type guard for icon component
	function isIconComponent(icon: unknown): icon is React.ComponentType<{ size?: number; className?: string }> {
		return typeof icon === "function";
	}

	// Use icon if it's a valid component, otherwise use default
	const iconComponent = isIconComponent(primarySection.icon)
		? primarySection.icon
		: GROUP_DEFINITIONS["data-input"].icon;

	const updatedDefinition: ToolGroupDefinition = {
		id: groupId,
		title: primarySection.title,
		icon: iconComponent,
		description: primarySection.tooltip || `Group containing ${primarySection.title}`,
		category: primarySection.category || "General",
		order: order,
	};

	registerGroupDefinition(updatedDefinition);
};

/**
 * Get group definition by category/id
 */
export const getGroupDefinition = (categoryId: string): ToolGroupDefinition | undefined => {
	return GROUP_DEFINITIONS[categoryId];
};

/**
 * Get all group definitions
 */
export const getAllGroups = (): ToolGroupDefinition[] => {
	return Object.values(GROUP_DEFINITIONS);
};