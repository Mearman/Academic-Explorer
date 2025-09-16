/**
 * ExpansionSettingsDialog component
 * Modal dialog for configuring expansion settings for entity and edge types
 */

import React, { useState, useEffect } from "react";
import {
	IconX,
	IconSettings,
	IconRefresh,
	IconEye,
	IconDownload,
	IconUpload
} from "@tabler/icons-react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { SortBuilder } from "./SortBuilder";
import { FilterBuilder } from "./FilterBuilder";
import { useExpansionSettingsStore } from "@/stores/expansion-settings-store";
import { ExpansionQueryBuilder } from "@/services/expansion-query-builder";
import { logger } from "@/lib/logger";
import type {
	ExpansionTarget,
	ExpansionSettings
} from "@/lib/graph/types/expansion-settings";
import { getDefaultSettingsForTarget } from "@/lib/graph/types/expansion-settings";

interface ExpansionSettingsDialogProps {
  target: ExpansionTarget;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpansionSettingsDialog: React.FC<ExpansionSettingsDialogProps> = ({
	target,
	isOpen,
	onClose
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const [localSettings, setLocalSettings] = useState<ExpansionSettings | null>(null);
	const [showPreview, setShowPreview] = useState(false);

	const expansionSettingsStore = useExpansionSettingsStore();
	const getSettings = expansionSettingsStore.getSettings;
	const updateSettings = expansionSettingsStore.updateSettings;
	const exportSettings = expansionSettingsStore.exportSettings;
	const importSettings = expansionSettingsStore.importSettings;

	// Load settings when dialog opens
	useEffect(() => {
		if (isOpen) {
			const currentSettings = getSettings(target);
			setLocalSettings({ ...currentSettings });
		}
	}, [isOpen, target, getSettings]);

	if (!isOpen || !localSettings) {
		return null;
	}

	const handleSave = () => {
		updateSettings(target, localSettings);
		logger.info("expansion", "Saved expansion settings", { target, settings: localSettings }, "ExpansionSettingsDialog");
		onClose();
	};

	const handleReset = () => {
		const defaultSettings = getDefaultSettingsForTarget(target);
		setLocalSettings({ ...defaultSettings });
	};

	const handleClose = () => {
		setLocalSettings(null);
		onClose();
	};

	const handleExport = () => {
		const allSettings = exportSettings();
		const dataStr = JSON.stringify(allSettings, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "expansion-settings.json";
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleImport = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (event) => {
					try {
						const jsonString = event.target?.result as string;
						const parsedData: unknown = JSON.parse(jsonString);

						// Type validation for parsed settings
						if (typeof parsedData === "object" && parsedData !== null) {
							const settings = parsedData as Record<string, ExpansionSettings>;
							importSettings(settings);
							// Reload current settings
							const newSettings = getSettings(target);
							setLocalSettings({ ...newSettings });
							logger.info("expansion", "Imported expansion settings", { target }, "ExpansionSettingsDialog");
						} else {
							throw new Error("Invalid settings format");
						}
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
						logger.error("expansion", "Failed to import settings", { error: errorMessage }, "ExpansionSettingsDialog");
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	};

	const validation: { valid: boolean; errors: string[] } = ExpansionQueryBuilder.validateSettings(localSettings);
	const queryPreview: string = ExpansionQueryBuilder.getQueryPreview(localSettings);

	return (
		<div style={{
			position: "fixed",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			zIndex: 1000
		}}>
			<div style={{
				backgroundColor: colors.background.primary,
				border: `1px solid ${colors.border.primary}`,
				borderRadius: "8px",
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
				width: "90%",
				maxWidth: "600px",
				maxHeight: "90vh",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column"
			}}>
				{/* Header */}
				<div style={{
					padding: "16px",
					borderBottom: `1px solid ${colors.border.primary}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between"
				}}>
					<div style={{
						display: "flex",
						alignItems: "center",
						gap: "8px"
					}}>
						<IconSettings size={20} color={colors.primary} />
						<div>
							<h3 style={{
								margin: 0,
								fontSize: "16px",
								fontWeight: 600,
								color: colors.text.primary
							}}>
                Expansion Settings
							</h3>
							<div style={{
								fontSize: "12px",
								color: colors.text.secondary,
								marginTop: "2px"
							}}>
								{target}
							</div>
						</div>
					</div>
					<button
						onClick={handleClose}
						style={{
							padding: "8px",
							backgroundColor: "transparent",
							border: "none",
							cursor: "pointer",
							color: colors.text.secondary,
							display: "flex",
							alignItems: "center",
							justifyContent: "center"
						}}
					>
						<IconX size={20} />
					</button>
				</div>

				{/* Content */}
				<div style={{
					flex: 1,
					overflow: "auto",
					padding: "16px"
				}}>
					<div style={{
						display: "flex",
						flexDirection: "column",
						gap: "20px"
					}}>
						{/* Basic Settings */}
						<div>
							<h4 style={{
								margin: "0 0 12px 0",
								fontSize: "14px",
								fontWeight: 600,
								color: colors.text.primary
							}}>
                Basic Settings
							</h4>
							<div style={{
								display: "flex",
								flexDirection: "column",
								gap: "12px"
							}}>
								<div>
									<label style={{
										display: "block",
										fontSize: "12px",
										fontWeight: 600,
										color: colors.text.primary,
										marginBottom: "4px"
									}}>
                    Result Limit (1-200)
									</label>
									<input
										type="number"
										min={1}
										max={200}
										value={localSettings.limit}
										onChange={(e) => { setLocalSettings({
											...localSettings,
											limit: Math.max(1, Math.min(200, Number(e.target.value)))
										}); }}
										style={{
											width: "100%",
											padding: "6px 8px",
											fontSize: "14px",
											backgroundColor: colors.background.secondary,
											border: `1px solid ${colors.border.primary}`,
											borderRadius: "4px",
											color: colors.text.primary
										}}
									/>
								</div>

								<div>
									<label style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "14px",
										color: colors.text.primary,
										cursor: "pointer"
									}}>
										<input
											type="checkbox"
											checked={localSettings.enabled}
											onChange={(e) => { setLocalSettings({
												...localSettings,
												enabled: e.target.checked
											}); }}
											style={{ margin: 0 }}
										/>
										<span>Enable expansion for this type</span>
									</label>
								</div>

								<div>
									<label style={{
										display: "block",
										fontSize: "12px",
										fontWeight: 600,
										color: colors.text.primary,
										marginBottom: "4px"
									}}>
                    Configuration Name (Optional)
									</label>
									<input
										type="text"
										value={localSettings.name || ""}
										onChange={(e) => { setLocalSettings({
											...localSettings,
											name: e.target.value
										}); }}
										placeholder="e.g., 'Recent High Impact'"
										style={{
											width: "100%",
											padding: "6px 8px",
											fontSize: "14px",
											backgroundColor: colors.background.secondary,
											border: `1px solid ${colors.border.primary}`,
											borderRadius: "4px",
											color: colors.text.primary
										}}
									/>
								</div>
							</div>
						</div>

						{/* Sort Settings */}
						<SortBuilder
							target={target}
							sorts={localSettings.sorts ?? []}
							onSortsChange={(sorts) => { setLocalSettings({ ...localSettings, sorts }); }}
						/>

						{/* Filter Settings */}
						<FilterBuilder
							target={target}
							filters={localSettings.filters ?? []}
							onFiltersChange={(filters) => { setLocalSettings({ ...localSettings, filters }); }}
						/>

						{/* Preview */}
						<div>
							<div style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: "12px"
							}}>
								<h4 style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: 600,
									color: colors.text.primary
								}}>
                  Query Preview
								</h4>
								<button
									onClick={() => { setShowPreview(!showPreview); }}
									style={{
										padding: "4px 8px",
										fontSize: "12px",
										backgroundColor: "transparent",
										color: colors.text.secondary,
										border: `1px solid ${colors.border.primary}`,
										borderRadius: "4px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px"
									}}
								>
									<IconEye size={14} />
									{showPreview ? "Hide" : "Show"}
								</button>
							</div>

							{showPreview && (
								<div style={{
									padding: "12px",
									backgroundColor: colors.background.secondary,
									border: `1px solid ${colors.border.primary}`,
									borderRadius: "6px",
									fontSize: "12px",
									fontFamily: "monospace",
									color: colors.text.secondary,
									wordBreak: "break-all"
								}}>
									{queryPreview || "No query parameters generated"}
								</div>
							)}

							{!validation.valid && (
								<div style={{
									marginTop: "8px",
									padding: "8px",
									backgroundColor: `${colors.error}15`,
									border: `1px solid ${colors.error}`,
									borderRadius: "4px"
								}}>
									<div style={{
										fontSize: "12px",
										fontWeight: 600,
										color: colors.error,
										marginBottom: "4px"
									}}>
                    Validation Errors:
									</div>
									{validation.errors.map((errorMsg, index) => (
										<div key={`error-${String(index)}-${errorMsg.substring(0, 20)}`} style={{
											fontSize: "11px",
											color: colors.error
										}}>
                      • {errorMsg}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div style={{
					padding: "16px",
					borderTop: `1px solid ${colors.border.primary}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between"
				}}>
					<div style={{
						display: "flex",
						gap: "8px"
					}}>
						<button
							onClick={handleExport}
							style={{
								padding: "6px 8px",
								fontSize: "12px",
								backgroundColor: "transparent",
								color: colors.text.secondary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "4px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px"
							}}
						>
							<IconDownload size={14} />
              Export
						</button>
						<button
							onClick={handleImport}
							style={{
								padding: "6px 8px",
								fontSize: "12px",
								backgroundColor: "transparent",
								color: colors.text.secondary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "4px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px"
							}}
						>
							<IconUpload size={14} />
              Import
						</button>
						<button
							onClick={handleReset}
							style={{
								padding: "6px 8px",
								fontSize: "12px",
								backgroundColor: "transparent",
								color: colors.text.secondary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "4px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "4px"
							}}
						>
							<IconRefresh size={14} />
              Reset
						</button>
					</div>

					<div style={{
						display: "flex",
						gap: "8px"
					}}>
						<button
							onClick={handleClose}
							style={{
								padding: "8px 16px",
								fontSize: "14px",
								backgroundColor: "transparent",
								color: colors.text.secondary,
								border: `1px solid ${colors.border.primary}`,
								borderRadius: "6px",
								cursor: "pointer"
							}}
						>
              Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={!validation.valid}
							style={{
								padding: "8px 16px",
								fontSize: "14px",
								backgroundColor: validation.valid ? colors.primary : colors.text.tertiary,
								color: colors.text.inverse,
								border: "none",
								borderRadius: "6px",
								cursor: validation.valid ? "pointer" : "not-allowed"
							}}
						>
              Save Settings
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};