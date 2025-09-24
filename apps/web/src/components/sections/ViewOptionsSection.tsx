/**
 * View Options Section
 * Configure graph visualization options and display settings
 */

import React from "react";
import { IconEye, IconPalette, IconSettings, IconCamera, IconAdjustments } from "@tabler/icons-react";
import { Button, Select, Switch, Slider, Group, Text, Divider } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { logger } from "@academic-explorer/utils/logger";

interface ViewOptionsSectionProps {
	className?: string;
}

export const ViewOptionsSection: React.FC<ViewOptionsSectionProps> = ({
	className = ""
}) => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;

	// Mock view settings - in a real implementation, these would come from a view settings store
	const [nodeSizing, setNodeSizing] = React.useState("uniform");
	const [nodeColorScheme, setNodeColorScheme] = React.useState("entity-type");
	const [edgeStyle, setEdgeStyle] = React.useState("straight");
	const [showLabels, setShowLabels] = React.useState(true);
	const [showNodeBorders, setShowNodeBorders] = React.useState(true);
	const [labelSize, setLabelSize] = React.useState(12);
	const [nodeSize, setNodeSize] = React.useState(20);
	const [edgeWidth, setEdgeWidth] = React.useState(2);

	const handleNodeSizingChange = (value: string | null) => {
		if (value) {
			setNodeSizing(value);
			logger.debug("ui", `Changed node sizing to ${value}`);
		}
	};

	const handleColorSchemeChange = (value: string | null) => {
		if (value) {
			setNodeColorScheme(value);
			logger.debug("ui", `Changed color scheme to ${value}`);
		}
	};

	const handleEdgeStyleChange = (value: string | null) => {
		if (value) {
			setEdgeStyle(value);
			logger.debug("ui", `Changed edge style to ${value}`);
		}
	};

	const handleToggleLabels = () => {
		const newValue = !showLabels;
		setShowLabels(newValue);
		logger.debug("ui", `Toggled labels to ${newValue ? "visible" : "hidden"}`);
	};

	const handleToggleNodeBorders = () => {
		const newValue = !showNodeBorders;
		setShowNodeBorders(newValue);
		logger.debug("ui", `Toggled node borders to ${newValue ? "visible" : "hidden"}`);
	};

	const handleResetView = () => {
		// Mock reset functionality
		logger.debug("ui", "Resetting view to defaults");
		// In a real implementation, this would reset zoom/pan
	};

	const handleExportImage = () => {
		// Mock export functionality
		logger.debug("ui", "Exporting graph image");
		// In a real implementation, this would capture the graph as an image
	};

	const handleFitToView = () => {
		// Mock fit to view functionality
		logger.debug("ui", "Fitting graph to view");
		// In a real implementation, this would call ReactFlow's fitView
	};

	return (
		<div className={className} style={{ padding: "16px" }}>
			<div style={{
				fontSize: "14px",
				fontWeight: 600,
				marginBottom: "12px",
				color: colors.text.primary,
				display: "flex",
				alignItems: "center",
				gap: "8px"
			}}>
				<IconEye size={16} />
				View Options
			</div>

			{/* Node Appearance */}
			<CollapsibleSection
				title="Node Appearance"
				icon={<IconAdjustments size={14} />}
				defaultExpanded={true}
				storageKey="view-options-nodes"
			>
				<div style={{ marginTop: "12px" }}>
					<div style={{ marginBottom: "16px" }}>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Node Sizing
						</Text>
						<Select
							value={nodeSizing}
							onChange={handleNodeSizingChange}
							data={[
								{ value: "uniform", label: "Uniform Size" },
								{ value: "citations", label: "By Citation Count" },
								{ value: "year", label: "By Publication Year" },
								{ value: "connections", label: "By Connection Count" }
							]}
							size="sm"
						/>
					</div>

					<div style={{ marginBottom: "16px" }}>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Color Scheme
						</Text>
						<Select
							value={nodeColorScheme}
							onChange={handleColorSchemeChange}
							data={[
								{ value: "entity-type", label: "By Entity Type" },
								{ value: "year", label: "By Publication Year" },
								{ value: "citations", label: "By Citation Count" },
								{ value: "journal", label: "By Journal/Source" },
								{ value: "monochrome", label: "Monochrome" }
							]}
							size="sm"
						/>
					</div>

					<div style={{ marginBottom: "16px" }}>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Node Size: {nodeSize}px
						</Text>
						<Slider
							value={nodeSize}
							onChange={setNodeSize}
							min={10}
							max={50}
							step={2}
							size="sm"
							color="blue"
						/>
					</div>

					<div style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "8px"
					}}>
						<div>
							<Text size="sm" fw={500}>Show Node Borders</Text>
							<Text size="xs" c="dimmed">
								Display borders around nodes
							</Text>
						</div>
						<Switch
							checked={showNodeBorders}
							onChange={handleToggleNodeBorders}
							size="sm"
						/>
					</div>
				</div>
			</CollapsibleSection>

			<Divider style={{ margin: "16px 0" }} />

			{/* Edge Appearance */}
			<CollapsibleSection
				title="Edge Appearance"
				icon={<IconSettings size={14} />}
				defaultExpanded={false}
				storageKey="view-options-edges"
			>
				<div style={{ marginTop: "12px" }}>
					<div style={{ marginBottom: "16px" }}>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Edge Style
						</Text>
						<Select
							value={edgeStyle}
							onChange={handleEdgeStyleChange}
							data={[
								{ value: "straight", label: "Straight Lines" },
								{ value: "curved", label: "Curved Lines" },
								{ value: "step", label: "Step Lines" },
								{ value: "smooth-step", label: "Smooth Step" }
							]}
							size="sm"
						/>
					</div>

					<div style={{ marginBottom: "16px" }}>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Edge Width: {edgeWidth}px
						</Text>
						<Slider
							value={edgeWidth}
							onChange={setEdgeWidth}
							min={1}
							max={8}
							step={0.5}
							size="sm"
							color="blue"
						/>
					</div>
				</div>
			</CollapsibleSection>

			<Divider style={{ margin: "16px 0" }} />

			{/* Labels & Text */}
			<CollapsibleSection
				title="Labels & Text"
				icon={<IconPalette size={14} />}
				defaultExpanded={false}
				storageKey="view-options-labels"
			>
				<div style={{ marginTop: "12px" }}>
					<div style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "16px"
					}}>
						<div>
							<Text size="sm" fw={500}>Show Labels</Text>
							<Text size="xs" c="dimmed">
								Display node labels
							</Text>
						</div>
						<Switch
							checked={showLabels}
							onChange={handleToggleLabels}
							size="sm"
						/>
					</div>

					{showLabels && (
						<div>
							<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
								Label Size: {labelSize}px
							</Text>
							<Slider
								value={labelSize}
								onChange={setLabelSize}
								min={8}
								max={20}
								step={1}
								size="sm"
								color="blue"
							/>
						</div>
					)}
				</div>
			</CollapsibleSection>

			<Divider style={{ margin: "16px 0" }} />

			{/* View Controls */}
			<CollapsibleSection
				title="View Controls"
				icon={<IconCamera size={14} />}
				defaultExpanded={false}
				storageKey="view-options-controls"
			>
				<div style={{ marginTop: "12px" }}>
					<Group gap="xs">
						<Button
							size="xs"
							variant="light"
							onClick={handleFitToView}
							color="blue"
						>
							Fit to View
						</Button>
						<Button
							size="xs"
							variant="light"
							onClick={handleResetView}
							color="orange"
						>
							Reset Zoom
						</Button>
					</Group>

					<Divider style={{ margin: "12px 0" }} />

					<div>
						<Text size="sm" fw={500} style={{ marginBottom: "8px" }}>
							Export Options
						</Text>
						<Group gap="xs">
							<Button
								size="xs"
								variant="light"
								leftSection={<IconCamera size={12} />}
								onClick={handleExportImage}
								color="green"
							>
								Export PNG
							</Button>
							<Button
								size="xs"
								variant="light"
								onClick={handleExportImage}
								color="green"
							>
								Export SVG
							</Button>
						</Group>
					</div>

					<div style={{
						marginTop: "16px",
						padding: "12px",
						backgroundColor: colors.background.secondary,
						borderRadius: "6px"
					}}>
						<Text size="xs" c="dimmed" style={{ marginBottom: "8px" }}>
							Performance Tips
						</Text>
						<Text size="xs" c="dimmed">
							• Disable labels for large graphs (&gt;500 nodes)
							• Use straight edges for better performance
							• Smaller node sizes improve rendering speed
						</Text>
					</div>
				</div>
			</CollapsibleSection>
		</div>
	);
};