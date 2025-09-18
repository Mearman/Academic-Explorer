/**
 * Expansion settings store
 * Manages expansion configurations for each entity and edge type
 * Uses Zustand with Immer for state management and localStorage for persistence
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { logger } from "@/lib/logger";
import type {
	ExpansionSettings,
	ExpansionTarget,
	SortCriteria,
	FilterCriteria
} from "@/lib/graph/types/expansion-settings";
import { getDefaultSettingsForTarget } from "@/lib/graph/types/expansion-settings";
import { RelationType } from "@/lib/graph/types";

interface ExpansionSettingsState {
  /** Settings per target type */
  settings: Record<ExpansionTarget, ExpansionSettings>;

  /** Actions */
  getSettings: (target: ExpansionTarget) => ExpansionSettings;
  updateSettings: (target: ExpansionTarget, settings: Partial<ExpansionSettings>) => void;
  resetSettings: (target: ExpansionTarget) => void;
  resetAllSettings: () => void;

  /** Sort criteria management */
  addSortCriteria: (target: ExpansionTarget, criteria: Omit<SortCriteria, "priority">) => void;
  updateSortCriteria: (target: ExpansionTarget, index: number, criteria: Partial<SortCriteria>) => void;
  removeSortCriteria: (target: ExpansionTarget, index: number) => void;
  reorderSortCriteria: (target: ExpansionTarget, fromIndex: number, toIndex: number) => void;

  /** Filter criteria management */
  addFilterCriteria: (target: ExpansionTarget, criteria: FilterCriteria) => void;
  updateFilterCriteria: (target: ExpansionTarget, index: number, criteria: Partial<FilterCriteria>) => void;
  removeFilterCriteria: (target: ExpansionTarget, index: number) => void;
  toggleFilterEnabled: (target: ExpansionTarget, index: number) => void;

  /** Utility functions */
  getSettingsSummary: (target: ExpansionTarget) => string;
  exportSettings: () => Record<string, ExpansionSettings>;
  importSettings: (settings: Record<string, ExpansionSettings>) => void;
}

// Initialize with default settings
const initializeDefaultSettings = (): Record<ExpansionTarget, ExpansionSettings> => {
	// Explicitly create the complete settings object with all required keys
	const settings = {
		// Entity types
		works: getDefaultSettingsForTarget("works"),
		authors: getDefaultSettingsForTarget("authors"),
		sources: getDefaultSettingsForTarget("sources"),
		institutions: getDefaultSettingsForTarget("institutions"),
		topics: getDefaultSettingsForTarget("topics"),
		concepts: getDefaultSettingsForTarget("concepts"),
		publishers: getDefaultSettingsForTarget("publishers"),
		funders: getDefaultSettingsForTarget("funders"),
		keywords: getDefaultSettingsForTarget("keywords"),

		// Relation types - each unique and specific
		[RelationType.AUTHORED]: getDefaultSettingsForTarget(RelationType.AUTHORED),
		[RelationType.AFFILIATED]: getDefaultSettingsForTarget(RelationType.AFFILIATED),
		[RelationType.PUBLISHED_IN]: getDefaultSettingsForTarget(RelationType.PUBLISHED_IN),
		[RelationType.FUNDED_BY]: getDefaultSettingsForTarget(RelationType.FUNDED_BY),
		[RelationType.REFERENCES]: getDefaultSettingsForTarget(RelationType.REFERENCES),
		[RelationType.RELATED_TO]: getDefaultSettingsForTarget(RelationType.RELATED_TO),
		[RelationType.SOURCE_PUBLISHED_BY]: getDefaultSettingsForTarget(RelationType.SOURCE_PUBLISHED_BY),
		[RelationType.INSTITUTION_CHILD_OF]: getDefaultSettingsForTarget(RelationType.INSTITUTION_CHILD_OF),
		[RelationType.PUBLISHER_CHILD_OF]: getDefaultSettingsForTarget(RelationType.PUBLISHER_CHILD_OF),
		[RelationType.WORK_HAS_TOPIC]: getDefaultSettingsForTarget(RelationType.WORK_HAS_TOPIC),
		[RelationType.WORK_HAS_KEYWORD]: getDefaultSettingsForTarget(RelationType.WORK_HAS_KEYWORD),
		[RelationType.AUTHOR_RESEARCHES]: getDefaultSettingsForTarget(RelationType.AUTHOR_RESEARCHES),
		[RelationType.INSTITUTION_LOCATED_IN]: getDefaultSettingsForTarget(RelationType.INSTITUTION_LOCATED_IN),
		[RelationType.FUNDER_LOCATED_IN]: getDefaultSettingsForTarget(RelationType.FUNDER_LOCATED_IN),
		[RelationType.TOPIC_PART_OF_FIELD]: getDefaultSettingsForTarget(RelationType.TOPIC_PART_OF_FIELD)
	};

	return settings;
};

export const useExpansionSettingsStore = create<ExpansionSettingsState>()(
	persist(
		immer((set, get) => ({
			settings: initializeDefaultSettings(),

			getSettings: (target: ExpansionTarget) => {
				return get().settings[target];
			},

			updateSettings: (target: ExpansionTarget, settingsUpdate: Partial<ExpansionSettings>) => {
				set((state) => {
					const currentSettings = state.settings[target];
					const updatedSettings = { ...currentSettings, ...settingsUpdate };
					state.settings[target] = updatedSettings;
				});

				logger.debug("expansion", "Updated settings for target", { target, settingsUpdate }, "ExpansionSettingsStore");
			},

			resetSettings: (target: ExpansionTarget) => {
				const defaultSettings = getDefaultSettingsForTarget(target);
				set((state) => {
					state.settings[target] = defaultSettings;
				});

				logger.debug("expansion", "Reset settings for target", { target }, "ExpansionSettingsStore");
			},

			resetAllSettings: () => {
				set((state) => {
					state.settings = initializeDefaultSettings();
				});

				logger.debug("expansion", "Reset all expansion settings", {}, "ExpansionSettingsStore");
			},

			addSortCriteria: (target: ExpansionTarget, criteria: Omit<SortCriteria, "priority">) => {
				set((state) => {
					const settings = state.settings[target];
					const sorts = settings.sorts ?? [];
					const newPriority = Math.max(0, ...sorts.map(s => s.priority)) + 1;
					const newCriteria: SortCriteria = { ...criteria, priority: newPriority };

					if (!settings.sorts) settings.sorts = [];
					settings.sorts.push(newCriteria);
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Added sort criteria", { target, criteria }, "ExpansionSettingsStore");
			},

			updateSortCriteria: (target: ExpansionTarget, index: number, criteriaUpdate: Partial<SortCriteria>) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.sorts) settings.sorts = [];
					settings.sorts[index] = { ...settings.sorts[index], ...criteriaUpdate };
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Updated sort criteria", { target, index, criteriaUpdate }, "ExpansionSettingsStore");
			},

			removeSortCriteria: (target: ExpansionTarget, index: number) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.sorts) settings.sorts = [];
					settings.sorts.splice(index, 1);

					// Renumber priorities to maintain sequence
					settings.sorts.forEach((sort, i) => {
						sort.priority = i + 1;
					});

					state.settings[target] = settings;
				});

				logger.debug("expansion", "Removed sort criteria", { target, index }, "ExpansionSettingsStore");
			},

			reorderSortCriteria: (target: ExpansionTarget, fromIndex: number, toIndex: number) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.sorts) settings.sorts = [];

					// Move the item
					const [movedItem] = settings.sorts.splice(fromIndex, 1);
					settings.sorts.splice(toIndex, 0, movedItem);

					// Renumber priorities to maintain sequence
					settings.sorts.forEach((sort, i) => {
						sort.priority = i + 1;
					});

					state.settings[target] = settings;
				});

				logger.debug("expansion", "Reordered sort criteria", { target, fromIndex, toIndex }, "ExpansionSettingsStore");
			},

			addFilterCriteria: (target: ExpansionTarget, criteria: FilterCriteria) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.filters) settings.filters = [];
					settings.filters.push(criteria);
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Added filter criteria", { target, criteria }, "ExpansionSettingsStore");
			},

			updateFilterCriteria: (target: ExpansionTarget, index: number, criteriaUpdate: Partial<FilterCriteria>) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.filters) settings.filters = [];
					settings.filters[index] = { ...settings.filters[index], ...criteriaUpdate };
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Updated filter criteria", { target, index, criteriaUpdate }, "ExpansionSettingsStore");
			},

			removeFilterCriteria: (target: ExpansionTarget, index: number) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.filters) settings.filters = [];
					settings.filters.splice(index, 1);
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Removed filter criteria", { target, index }, "ExpansionSettingsStore");
			},

			toggleFilterEnabled: (target: ExpansionTarget, index: number) => {
				set((state) => {
					const settings = state.settings[target];
					if (!settings.filters) settings.filters = [];
					settings.filters[index].enabled = !settings.filters[index].enabled;
					state.settings[target] = settings;
				});

				logger.debug("expansion", "Toggled filter enabled", { target, index }, "ExpansionSettingsStore");
			},

			getSettingsSummary: (target: ExpansionTarget): string => {
				const settings = get().settings[target];

				const parts: string[] = [];

				// Add sort summary
				const sorts = settings.sorts ?? [];
				if (sorts.length > 0) {
					const sortSummary = sorts
						.sort((a, b) => a.priority - b.priority)
						.map(s => `${s.direction === "desc" ? "↓" : "↑"}${s.label || s.property}`)
						.join(", ");
					parts.push(sortSummary);
				}

				// Add filter summary
				const filters = settings.filters ?? [];
				const enabledFilters = filters.filter(f => f.enabled);
				if (enabledFilters.length > 0) {
					parts.push(`${enabledFilters.length.toString()} filters`);
				}

				// Add limit
				const limitValue = settings.limit ?? 0;
				parts.push(limitValue > 0 ? `${limitValue.toString()} max` : "unlimited");

				return parts.join(" | ");
			},

			exportSettings: () => {
				const settings = get().settings;
				return settings;
			},

			importSettings: (settingsObject: Record<string, ExpansionSettings>) => {
				set((state) => {
					// Start with current settings and update only valid targets
					const newSettings = { ...state.settings };

					// Copy only valid expansion targets (entity types or relation types)
					Object.entries(settingsObject).forEach(([key, value]) => {
						// Type guard for entity types
						function isEntityType(k: string): k is "works" | "authors" | "sources" | "institutions" | "topics" | "concepts" | "publishers" | "funders" | "keywords" {
							return ["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"].includes(k);
						}

						// Type guard for relation types
						function isRelationType(k: string): k is RelationType {
							const relationTypes: string[] = Object.values(RelationType);
							return relationTypes.includes(k);
						}

						if (isEntityType(key) || isRelationType(key)) {
							newSettings[key] = value;
						}
					});

					state.settings = newSettings;
				});

				logger.debug("expansion", "Imported settings", { count: Object.keys(settingsObject).length }, "ExpansionSettingsStore");
			}
		})),
		{
			name: "academic-explorer-expansion-settings",
			storage: createJSONStorage(() => localStorage),
			onRehydrateStorage: () => (state) => {
				if (state) {
					logger.debug("expansion", "Rehydrated expansion settings from localStorage", {
						settingsCount: Object.keys(state.settings).length
					}, "ExpansionSettingsStore");
				}
			}
		}
	)
);

// Export a hook for getting settings for a specific target
export const useExpansionSettings = (target: ExpansionTarget) => {
	return useExpansionSettingsStore((state) => state.getSettings(target));
};

// Export a hook for getting the settings summary
export const useExpansionSettingsSummary = (target: ExpansionTarget) => {
	return useExpansionSettingsStore((state) => state.getSettingsSummary(target));
};