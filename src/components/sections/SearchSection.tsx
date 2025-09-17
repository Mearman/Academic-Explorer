/**
 * Search section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useState } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";

export const SearchSection: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const graphData = useGraphData();
	const { loadEntity, isLoading } = graphData;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim() || isLoading) return;

		void (async () => {
			try {
				logger.info("ui", "Starting search from SearchSection", { query: searchQuery });
				await loadEntity(searchQuery);
				logger.info("ui", "Search completed successfully", { query: searchQuery });
			} catch (error) {
				logger.error("ui", "Search failed", { query: searchQuery, error });
			}
		})();
	};

	return (
		<form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			<input
				type="text"
				value={searchQuery}
				onChange={(e) => { setSearchQuery(e.target.value); }}
				placeholder="Enter keywords, DOI, ORCID, etc..."
				style={{
					width: "100%",
					padding: "8px 12px",
					border: `1px solid ${colors.border.primary}`,
					borderRadius: "6px",
					fontSize: "14px",
					outline: "none",
					boxSizing: "border-box",
					backgroundColor: colors.background.primary,
					color: colors.text.primary,
				}}
				disabled={isLoading}
			/>
			<button
				type="submit"
				disabled={!searchQuery.trim() || isLoading}
				style={{
					padding: "8px 16px",
					backgroundColor: isLoading ? colors.text.tertiary : colors.primary,
					color: colors.text.inverse,
					border: "none",
					borderRadius: "6px",
					fontSize: "14px",
					cursor: isLoading ? "not-allowed" : "pointer",
					transition: "background-color 0.2s",
				}}
			>
				{isLoading ? "Searching..." : "Search"}
			</button>
		</form>
	);
};