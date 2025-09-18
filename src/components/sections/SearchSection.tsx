/**
 * Search section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useState, useCallback } from "react";
import { Switch, Group, Text, Stack } from "@mantine/core";
import { IconGraph, IconArchive } from "@tabler/icons-react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useRepositoryStore } from "@/stores/repository-store";
import { logger } from "@/lib/logger";

export const SearchSection: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const graphData = useGraphData();
	const { loadEntity, loadEntityIntoRepository, isLoading } = graphData;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Repository store
	const repositoryStore = useRepositoryStore();
	const repositoryMode = repositoryStore.repositoryMode;
	const setRepositoryMode = repositoryStore.setRepositoryMode;

	const handleRepositoryModeToggle = useCallback((checked: boolean) => {
		setRepositoryMode(checked);
		logger.info("ui", `Repository mode ${checked ? "enabled" : "disabled"}`, {
			repositoryMode: checked
		});
	}, [setRepositoryMode]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim() || isLoading) return;

		void (async () => {
			try {
				logger.info("ui", "Starting search from SearchSection", {
					query: searchQuery,
					repositoryMode
				});

				if (repositoryMode) {
					// Repository mode - add entity to repository collection
					await loadEntityIntoRepository(searchQuery);
				} else {
					// Live mode - add directly to graph (current behavior)
					await loadEntity(searchQuery);
				}

				logger.info("ui", "Search completed successfully", {
					query: searchQuery,
					repositoryMode
				});
			} catch (error) {
				logger.error("ui", "Search failed", { query: searchQuery, error });
			}
		})();
	};

	return (
		<Stack gap="sm">
			{/* Repository mode toggle */}
			<Group gap="xs" wrap="nowrap">
				<Switch
					size="sm"
					checked={repositoryMode}
					onChange={(event) => { handleRepositoryModeToggle(event.currentTarget.checked); }}
					color="blue"
					thumbIcon={
						repositoryMode ? (
							<IconArchive size={12} style={{ color: colors.text.inverse }} />
						) : (
							<IconGraph size={12} style={{ color: colors.text.secondary }} />
						)
					}
				/>
				<div style={{ flex: 1 }}>
					<Text size="sm" style={{ fontWeight: 500, color: colors.text.primary }}>
						{repositoryMode ? "Repository Mode" : "Live Mode"}
					</Text>
					<Text size="xs" style={{ color: colors.text.secondary }}>
						{repositoryMode
							? "Search adds to repository for manual drag-to-graph"
							: "Search immediately adds results to graph"
						}
					</Text>
				</div>
			</Group>

			{/* Search form */}
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
					{isLoading ? "Searching..." : repositoryMode ? "Search → Repository" : "Search → Graph"}
				</button>
			</form>
		</Stack>
	);
};