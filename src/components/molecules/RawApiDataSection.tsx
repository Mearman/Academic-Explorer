/**
 * Component to display raw OpenAlex API data in a readable format
 * Fetches data on demand only when entityId is provided
 */

import React, { useState } from "react";
import { IconCode, IconEye, IconEyeOff, IconDownload, IconLoader, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";

interface RawApiDataSectionProps {
  entityId?: string | null;
  className?: string;
}

export const RawApiDataSection: React.FC<RawApiDataSectionProps> = ({
	entityId,
	className
}) => {
	const { colors } = useThemeColors();
	const [isExpanded, setIsExpanded] = useState(false);
	const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

	const {
		data: rawData,
		isLoading,
		error,
		isError
	} = useRawEntityData({
		entityId,
		enabled: !!entityId && isExpanded
	});

	const ExpandableSection: React.FC<{
		title: string;
		itemCount: number;
		children: React.ReactNode;
		defaultExpanded?: boolean;
	}> = ({ title, itemCount, children, defaultExpanded = false }) => {
		const [isExpanded, setIsExpanded] = useState(defaultExpanded);

		return (
			<div>
				<div
					style={{
						color: "#6b7280",
						fontStyle: "italic",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						padding: "2px 0",
						userSelect: "none"
					}}
					onClick={() => {
						setIsExpanded(!isExpanded);
					}}
				>
					{isExpanded ? (
						<IconChevronDown size={12} />
					) : (
						<IconChevronRight size={12} />
					)}
					{title} ({itemCount} items)
				</div>
				{isExpanded && (
					<div style={{ marginLeft: "8px" }}>
						{children}
					</div>
				)}
			</div>
		);
	};

	const formatValue = (value: unknown, depth = 0): React.ReactNode => {
		if (value === null) return <span style={{ color: "#6b7280", fontStyle: "italic" }}>null</span>;
		if (value === undefined) return <span style={{ color: "#6b7280", fontStyle: "italic" }}>undefined</span>;

		if (typeof value === "boolean") {
			return <span style={{ color: "#059669" }}>{value ? "true" : "false"}</span>;
		}

		if (typeof value === "number") {
			return <span style={{ color: "#dc2626" }}>{value.toLocaleString()}</span>;
		}

		if (typeof value === "string") {
			// Detect URLs and make them clickable
			if (value.startsWith("http")) {
				return (
					<a
						href={value}
						target="_blank"
						rel="noopener noreferrer"
						style={{
							color: "#2563eb",
							textDecoration: "underline",
							wordBreak: "break-all"
						}}
					>
						{value}
					</a>
				);
			}
			return <span style={{ color: "#111827" }}>{value}</span>;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return <span style={{ color: "#6b7280", fontStyle: "italic" }}>[]</span>;
			}

			// Show first few items, then expandable section for the rest
			const showDirectly = Math.min(3, value.length);
			const hasMore = value.length > showDirectly;

			return (
				<div style={{ marginLeft: "8px" }}>
					{value.slice(0, showDirectly).map((item, index) => (
						<div key={index} style={{ marginBottom: "2px" }}>
							<span style={{ color: "#6b7280" }}>[{index}]:</span>{" "}
							{formatValue(item, depth + 1)}
						</div>
					))}
					{hasMore && (
						<ExpandableSection
							title={`More array items`}
							itemCount={value.length - showDirectly}
							defaultExpanded={value.length <= 20} // Auto-expand smaller arrays
						>
							{value.slice(showDirectly).map((item, index) => (
								<div key={index + showDirectly} style={{ marginBottom: "2px" }}>
									<span style={{ color: "#6b7280" }}>[{index + showDirectly}]:</span>{" "}
									{formatValue(item, depth + 1)}
								</div>
							))}
						</ExpandableSection>
					)}
				</div>
			);
		}

		if (typeof value === "object") {
			const entries = Object.entries(value as Record<string, unknown>);

			if (entries.length === 0) {
				return <span style={{ color: "#6b7280", fontStyle: "italic" }}>{"{}"}</span>;
			}

			// Show first few properties, then expandable section for the rest
			const showDirectly = Math.min(5, entries.length);
			const hasMore = entries.length > showDirectly;

			return (
				<div style={{ marginLeft: "8px" }}>
					{entries.slice(0, showDirectly).map(([key, val]) => (
						<div key={key} style={{ marginBottom: "2px" }}>
							<span style={{ color: "#1f2937", fontWeight: "500" }}>{key}:</span>{" "}
							{formatValue(val, depth + 1)}
						</div>
					))}
					{hasMore && (
						<ExpandableSection
							title={`More object properties`}
							itemCount={entries.length - showDirectly}
							defaultExpanded={entries.length <= 15} // Auto-expand smaller objects
						>
							{entries.slice(showDirectly).map(([key, val]) => (
								<div key={key} style={{ marginBottom: "2px" }}>
									<span style={{ color: "#1f2937", fontWeight: "500" }}>{key}:</span>{" "}
									{formatValue(val, depth + 1)}
								</div>
							))}
						</ExpandableSection>
					)}
				</div>
			);
		}

		// Fallback for any other value types (should rarely happen)
		if (typeof value === "object") {
			return <span style={{ color: "#6b7280", fontStyle: "italic" }}>[Unknown Object]</span>;
		}

		// Only primitive types should reach here (string, number, boolean, symbol, bigint)
		return <span>{value as string | number | boolean}</span>;
	};

	const downloadJsonData = () => {
		if (!rawData) return;

		try {
			const jsonString = JSON.stringify(rawData, null, 2);
			const blob = new Blob([jsonString], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `openalex-${entityId?.split("/").pop() || "entity"}-data.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			URL.revokeObjectURL(url);

			logger.info("ui", "Raw API data downloaded", {
				entityId,
				filename: a.download
			}, "RawApiDataSection");
		} catch (error) {
			logger.error("ui", "Failed to download raw API data", {
				entityId,
				error: error instanceof Error ? error.message : "Unknown error"
			}, "RawApiDataSection");
		}
	};

	if (!entityId) {
		return null;
	}

	return (
		<div className={className}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					paddingBottom: "8px",
					borderBottom: `1px solid ${colors.border.primary}`,
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary,
					cursor: "pointer"
				}}
				onClick={() => { setIsExpanded(!isExpanded); }}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<IconCode size={16} />
          Raw API Data
				</div>
				{isExpanded ? <IconEyeOff size={16} /> : <IconEye size={16} />}
			</div>

			{/* Content */}
			{isExpanded && (
				<div style={{ marginTop: "12px" }}>
					{isLoading && (
						<div style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							padding: "12px",
							color: "#6b7280",
							fontSize: "12px"
						}}>
							<IconLoader size={16} style={{ animation: "spin 1s linear infinite" }} />
              Loading raw API data...
						</div>
					)}

					{isError && (
						<div style={{
							padding: "12px",
							backgroundColor: "#fef2f2",
							borderRadius: "6px",
							border: "1px solid #fecaca",
							color: "#dc2626",
							fontSize: "12px"
						}}>
              Failed to load raw API data: {error instanceof Error ? error.message : "Unknown error"}
						</div>
					)}

					{rawData && (
						<>
							{/* Controls */}
							<div style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "12px",
								paddingBottom: "8px",
								borderBottom: `1px solid ${colors.border.secondary}`
							}}>
								<button
									onClick={() => { setViewMode("formatted"); }}
									style={{
										padding: "4px 8px",
										fontSize: "11px",
										backgroundColor: viewMode === "formatted" ? "#3b82f6" : "#f3f4f6",
										color: viewMode === "formatted" ? "white" : "#374151",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									}}
								>
                  Formatted
								</button>
								<button
									onClick={() => { setViewMode("raw"); }}
									style={{
										padding: "4px 8px",
										fontSize: "11px",
										backgroundColor: viewMode === "raw" ? "#3b82f6" : "#f3f4f6",
										color: viewMode === "raw" ? "white" : "#374151",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer"
									}}
								>
                  Raw JSON
								</button>
								<button
									onClick={downloadJsonData}
									style={{
										padding: "4px 8px",
										fontSize: "11px",
										backgroundColor: "#10b981",
										color: "white",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px"
									}}
								>
									<IconDownload size={12} />
                  Download
								</button>
							</div>

							{/* Data Display */}
							<div style={{
								maxHeight: "400px",
								overflow: "auto",
								padding: "12px",
								backgroundColor: "#f9fafb",
								borderRadius: "6px",
								border: "1px solid #e5e7eb"
							}}>
								{viewMode === "formatted" ? (
									<div style={{
										fontSize: "11px",
										fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
										lineHeight: "1.4"
									}}>
										{formatValue(rawData)}
									</div>
								) : (
									<pre style={{
										fontSize: "10px",
										fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
										margin: 0,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										color: "#374151"
									}}>
										{JSON.stringify(rawData, null, 2)}
									</pre>
								)}
							</div>

							{/* Data Stats */}
							<div style={{
								marginTop: "8px",
								fontSize: "10px",
								color: "#6b7280",
								textAlign: "center"
							}}>
								{Object.keys(rawData).length} properties • {JSON.stringify(rawData).length.toLocaleString()} characters
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};