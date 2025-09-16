/**
 * Component to display raw OpenAlex API data in a readable format
 * Fetches data on demand only when entityId is provided
 */

import React, { useState } from "react";
import { IconDownload, IconLoader, IconCopy } from "@tabler/icons-react";
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
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

	const rawEntityDataResult = useRawEntityData({
		entityId,
		enabled: !!entityId
	});
	const rawData = rawEntityDataResult.data;
	const isLoading = rawEntityDataResult.isLoading;
	const error = rawEntityDataResult.error;
	const isError = rawEntityDataResult.isError;

	// Note: ExpandableSection component removed as we now show all data expanded by default

	const formatValue = (value: unknown, depth = 0): React.ReactNode => {
		// Enhanced styling with better visual hierarchy
		const indentSize = 16;

		if (value === null) return (
			<span style={{
				color: colors.text.secondary,
				fontStyle: "italic",
				fontSize: "12px",
				fontWeight: "500"
			}}>
				null
			</span>
		);

		if (value === undefined) return (
			<span style={{
				color: colors.text.secondary,
				fontStyle: "italic",
				fontSize: "12px",
				fontWeight: "500"
			}}>
				undefined
			</span>
		);

		if (typeof value === "boolean") {
			return (
				<span style={{
					color: value ? "#10b981" : "#f59e0b",
					fontWeight: "600",
					fontSize: "12px"
				}}>
					{value ? "true" : "false"}
				</span>
			);
		}

		if (typeof value === "number") {
			return (
				<span style={{
					color: "#dc2626",
					fontWeight: "600",
					fontSize: "12px"
				}}>
					{value.toLocaleString()}
				</span>
			);
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
							wordBreak: "break-all",
							fontSize: "12px",
							fontWeight: "500",
							backgroundColor: "#eff6ff",
							padding: "1px 4px",
							borderRadius: "3px"
						}}
					>
						{value}
					</a>
				);
			}

			// Enhanced string styling with quotes and better contrast
			return (
				<span style={{
					color: "#059669",
					fontSize: "12px",
					fontWeight: "500"
				}}>
					"{value}"
				</span>
			);
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return (
					<span style={{
						color: colors.text.secondary,
						fontStyle: "italic",
						fontSize: "12px",
						backgroundColor: "#f3f4f6",
						padding: "2px 6px",
						borderRadius: "4px"
					}}>
						[] (empty array)
					</span>
				);
			}

			// Enhanced array display with better visual hierarchy
			return (
				<div style={{
					marginLeft: `${indentSize.toString()}px`,
					borderLeft: `2px solid ${colors.border.secondary}`,
					paddingLeft: "8px",
					marginTop: "4px"
				}}>
					<div style={{
						color: colors.text.secondary,
						fontSize: "11px",
						fontWeight: "600",
						marginBottom: "4px",
						textTransform: "uppercase",
						letterSpacing: "0.5px"
					}}>
						Array ({value.length} items)
					</div>
					{value.map((item, index) => (
						<div key={`array-item-${String(index)}-${JSON.stringify(item).substring(0, 20)}`} style={{
							marginBottom: "6px",
							paddingBottom: "4px",
							borderBottom: index < value.length - 1 ? `1px solid ${colors.border.secondary}` : "none"
						}}>
							<span style={{
								color: "#8b5cf6",
								fontWeight: "600",
								fontSize: "11px",
								backgroundColor: "#f3f4f6",
								padding: "1px 4px",
								borderRadius: "3px",
								marginRight: "8px"
							}}>
								[{index}]
							</span>
							{formatValue(item, depth + 1)}
						</div>
					))}
				</div>
			);
		}

		if (typeof value === "object") {
			const entries = Object.entries(value as Record<string, unknown>);

			if (entries.length === 0) {
				return (
					<span style={{
						color: colors.text.secondary,
						fontStyle: "italic",
						fontSize: "12px",
						backgroundColor: "#f3f4f6",
						padding: "2px 6px",
						borderRadius: "4px"
					}}>
						{"{}"} (empty object)
					</span>
				);
			}

			// Enhanced object display with better visual hierarchy
			return (
				<div style={{
					marginLeft: `${indentSize.toString()}px`,
					borderLeft: `2px solid ${colors.border.secondary}`,
					paddingLeft: "8px",
					marginTop: "4px"
				}}>
					<div style={{
						color: colors.text.secondary,
						fontSize: "11px",
						fontWeight: "600",
						marginBottom: "4px",
						textTransform: "uppercase",
						letterSpacing: "0.5px"
					}}>
						Object ({entries.length} properties)
					</div>
					{entries.map(([key, val], index) => (
						<div key={key} style={{
							marginBottom: "6px",
							paddingBottom: "4px",
							borderBottom: index < entries.length - 1 ? `1px solid ${colors.border.secondary}` : "none"
						}}>
							<span style={{
								color: "#1f2937",
								fontWeight: "600",
								fontSize: "12px",
								backgroundColor: "#fef3c7",
								padding: "1px 4px",
								borderRadius: "3px",
								marginRight: "8px"
							}}>
								{key}:
							</span>
							{formatValue(val, depth + 1)}
						</div>
					))}
				</div>
			);
		}

		// Fallback for any other value types (should rarely happen)
		if (typeof value === "object") {
			return (
				<span style={{
					color: colors.text.secondary,
					fontStyle: "italic",
					fontSize: "12px",
					backgroundColor: "#fef2f2",
					padding: "2px 6px",
					borderRadius: "4px"
				}}>
					[Unknown Object]
				</span>
			);
		}

		// Only primitive types should reach here (string, number, boolean, symbol, bigint)
		return (
			<span style={{
				color: colors.text.primary,
				fontSize: "12px"
			}}>
				{value as string | number | boolean}
			</span>
		);
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

	const copyJsonData = async () => {
		if (!rawData) return;

		try {
			const jsonString = JSON.stringify(rawData, null, 2);
			await navigator.clipboard.writeText(jsonString);

			logger.info("ui", "Raw API data copied to clipboard", {
				entityId,
				dataSize: jsonString.length
			}, "RawApiDataSection");
		} catch (error) {
			logger.error("ui", "Failed to copy raw API data to clipboard", {
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
							onClick={() => { void copyJsonData(); }}
							style={{
								padding: "4px 8px",
								fontSize: "11px",
								backgroundColor: "#8b5cf6",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px"
							}}
						>
							<IconCopy size={12} />
                  Copy
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
						maxHeight: "500px",
						overflow: "auto",
						padding: "16px",
						backgroundColor: "#ffffff",
						borderRadius: "8px",
						border: `2px solid ${colors.border.secondary}`,
						boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
					}}>
						{viewMode === "formatted" ? (
							<div style={{
								fontSize: "12px",
								fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
								lineHeight: "1.6",
								color: colors.text.primary
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
	);
};