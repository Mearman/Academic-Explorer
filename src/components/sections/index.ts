/**
 * Section components exports
 * All dynamically loadable sidebar sections
 */

import React from "react";

export { SearchSection } from "./SearchSection";
export { EntityFiltersSection } from "./EntityFiltersSection";
export { GraphActionsSection } from "./GraphActionsSection";
export { SettingsSection } from "./SettingsSection";

// Placeholder sections for remaining implementations
export { CacheSettingsSection } from "./CacheSettingsSection";

export { EdgeFiltersSection } from "./EdgeFiltersSection";

export { EntityInfoSection } from "./EntityInfoSection";

export const ExternalLinksSection: React.FC = () => {
	return React.createElement("div", {}, "External Links Section - TODO: Implement");
};

export const ViewOptionsSection: React.FC = () => {
	return React.createElement("div", {}, "View Options Section - TODO: Implement");
};

export { RawApiDataSection } from "@/components/molecules/RawApiDataSection";

export { GraphStatsSection } from "./GraphStatsSection";