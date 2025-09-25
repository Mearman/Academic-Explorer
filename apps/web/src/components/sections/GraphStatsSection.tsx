/**
 * Graph Statistics Section
 * Displays comprehensive graph statistics and metrics
 */

import React, { useMemo } from "react";
import { IconChartBar, IconCircle, IconLink, IconTrendingUp, IconDownload } from "@tabler/icons-react";
import { Button, Badge, Progress, Divider } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { logger } from "@academic-explorer/utils/logger";
// Types imported but used indirectly through store types

interface GraphStatsSectionProps {
	className?: string;
}

export const GraphStatsSection: React.FC<GraphStatsSectionProps> = ({
	className = ""
}) => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;

	// Get stats from graph store
	const totalNodeCount = useGraphStore((state) => state.totalNodeCount);
	const totalEdgeCount = useGraphStore((state) => state.totalEdgeCount);
	const entityTypeStats = useGraphStore((state) => state.entityTypeStats);
	const edgeTypeStats = useGraphStore((state) => state.edgeTypeStats);
	const lastSearchStats = useGraphStore((state) => state.lastSearchStats);

	// Calculate derived metrics
	const networkMetrics = useMemo(() => {
		const density = totalNodeCount > 1
			? (2 * totalEdgeCount) / (totalNodeCount * (totalNodeCount - 1))
			: 0;

		const avgDegree = totalNodeCount > 0 ? (2 * totalEdgeCount) / totalNodeCount : 0;

		return {
			density: Math.round(density * 10000) / 100, // As percentage with 2 decimal places
			avgDegree: Math.round(avgDegree * 100) / 100
		};
	}, [totalNodeCount, totalEdgeCount]);

	// Top entity types by count
	const topEntityTypes = useMemo(() => {
		return Object.entries(entityTypeStats?.visible || {})
			.filter(([, count]) => count > 0)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);
	}, [entityTypeStats?.visible]);

	// Top edge types by count
	const topEdgeTypes = useMemo(() => {
		return Object.entries(edgeTypeStats?.visible || {})
			.filter(([, count]) => count > 0)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);
	}, [edgeTypeStats?.visible]);

	const handleExportStats = () => {
		const stats = {
			timestamp: new Date().toISOString(),
			network: {
				nodes: totalNodeCount,
				edges: totalEdgeCount,
				density: networkMetrics.density,
				averageDegree: networkMetrics.avgDegree
			},
			entityTypes: entityTypeStats,
			edgeTypes: edgeTypeStats,
			lastSearch: lastSearchStats
		};

		const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `graph-stats-${new Date().toISOString().split("T")[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		logger.debug("ui", "Graph statistics exported", {
			nodeCount: totalNodeCount,
			edgeCount: totalEdgeCount
		});
	};

	const StatItem: React.FC<{ label: string; value: string | number; icon?: React.ReactNode }> = ({
		label,
		value,
		icon
	}) => (
		<div style={{
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			padding: "8px 0",
			borderBottom: `1px solid ${colors.border.secondary}`,
		}}>
			<div style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				fontSize: "13px",
				color: colors.text.secondary
			}}>
				{icon}
				{label}
			</div>
			<div style={{
				fontSize: "14px",
				fontWeight: 600,
				color: colors.text.primary
			}}>
				{typeof value === "number" && value > 999
					? value.toLocaleString()
					: value
				}
			</div>
		</div>
	);

	const EntityTypeBar: React.FC<{ type: string; count: number; total: number }> = ({
		type,
		count,
		total
	}) => {
		const percentage = total > 0 ? (count / total) * 100 : 0;
		return (
			<div style={{ marginBottom: "8px" }}>
				<div style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "4px"
				}}>
					<span style={{ fontSize: "12px", textTransform: "capitalize" }}>
						{type.replace("_", " ")}
					</span>
					<Badge size="xs" variant="light">
						{count}
					</Badge>
				</div>
				<Progress
					value={percentage}
					size="sm"
					color="blue"
					style={{ opacity: 0.8 }}
				/>
			</div>
		);
	};

	if (totalNodeCount === 0) {
		return (
			<div
				className={className}
				style={{
					padding: "24px",
					textAlign: "center",
					color: colors.text.secondary
				}}
			>
				<IconChartBar
					size={48}
					style={{
						opacity: 0.3,
						marginBottom: "12px"
					}}
				/>
				<div style={{
					fontSize: "14px",
					fontWeight: 500,
					marginBottom: "8px"
				}}>
					No Graph Data
				</div>
				<div style={{
					fontSize: "12px",
					opacity: 0.7
				}}>
					Search for entities to see graph statistics
				</div>
			</div>
		);
	}

	return (
		<div className={className} style={{ padding: "16px" }}>
			<div style={{
				fontSize: "14px",
				fontWeight: 600,
				marginBottom: "16px",
				color: colors.text.primary,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between"
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<IconChartBar size={16} />
					Graph Statistics
				</div>
				<Button
					size="xs"
					variant="subtle"
					leftSection={<IconDownload size={12} />}
					onClick={handleExportStats}
				>
					Export
				</Button>
			</div>

			{/* Basic Statistics */}
			<CollapsibleSection
				title="Network Overview"
				icon={<IconTrendingUp size={14} />}
				defaultExpanded={true}
				storageKey="graph-stats-network-overview"
			>
				<div style={{ marginTop: "8px" }}>
					<StatItem
						label="Total Nodes"
						value={totalNodeCount}
						icon={<IconCircle size={14} />}
					/>
					<StatItem
						label="Total Edges"
						value={totalEdgeCount}
						icon={<IconLink size={14} />}
					/>
					<StatItem
						label="Network Density"
						value={`${networkMetrics.density.toString()}%`}
						icon={<IconTrendingUp size={14} />}
					/>
					<StatItem
						label="Avg. Connections"
						value={networkMetrics.avgDegree}
						icon={<IconTrendingUp size={14} />}
					/>
				</div>
			</CollapsibleSection>

			<Divider style={{ margin: "16px 0" }} />

			{/* Entity Types Distribution */}
			<CollapsibleSection
				title={`Entity Types (${topEntityTypes.length.toString()})`}
				icon={<IconCircle size={14} />}
				defaultExpanded={false}
				storageKey="graph-stats-entity-types"
			>
				<div style={{ marginTop: "12px" }}>
					{topEntityTypes.map(([type, count]) => (
						<EntityTypeBar
							key={type}
							type={type}
							count={count}
							total={totalNodeCount}
						/>
					))}
				</div>
			</CollapsibleSection>

			<Divider style={{ margin: "16px 0" }} />

			{/* Edge Types Distribution */}
			<CollapsibleSection
				title={`Connection Types (${topEdgeTypes.length.toString()})`}
				icon={<IconLink size={14} />}
				defaultExpanded={false}
				storageKey="graph-stats-edge-types"
			>
				<div style={{ marginTop: "12px" }}>
					{topEdgeTypes.map(([type, count]) => (
						<EntityTypeBar
							key={type}
							type={type}
							count={count}
							total={totalEdgeCount}
						/>
					))}
				</div>
			</CollapsibleSection>

			{/* Search Results Summary */}
			{Object.values(lastSearchStats || {}).some(v => v > 0) && (
				<>
					<Divider style={{ margin: "16px 0" }} />
					<CollapsibleSection
						title="Last Search Results"
						icon={<IconChartBar size={14} />}
						defaultExpanded={false}
						storageKey="graph-stats-search-results"
					>
						<div style={{ marginTop: "8px" }}>
							{Object.entries(lastSearchStats)
								.filter(([, count]) => count > 0)
								.map(([type, count]) => (
									<StatItem
										key={type}
										label={type.replace("_", " ")}
										value={count}
									/>
								))
							}
						</div>
					</CollapsibleSection>
				</>
			)}
		</div>
	);
};