/**
 * Settings section for user preferences and data management
 */

import React from "react";
import { Button, Stack, Text, Alert, Group } from "@mantine/core";
import { IconTrash, IconRefresh, IconSettings, IconAlertTriangle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllCacheLayers } from "@/lib/cache/cache-invalidator";
import { clearAppMetadata } from "@/lib/cache/metadata-store";
import { useLayoutStore } from "@/stores/layout-store";
import { logger, logError } from "@/lib/logger";

interface ResetState {
	clearingCache: boolean;
	resettingPreferences: boolean;
}

export const SettingsSection: React.FC = () => {
	const [resetState, setResetState] = React.useState<ResetState>({
		clearingCache: false,
		resettingPreferences: false,
	});

	const queryClient = useQueryClient();

	/**
	 * Reset user preferences to defaults
	 */
	const handleResetPreferences = async (): Promise<void> => {
		setResetState(prev => ({ ...prev, resettingPreferences: true }));

		try {
			logger.debug("ui", "Starting user preferences reset", {}, "SettingsSection");

			// Clear Zustand persisted stores
			// This will reset layout store, expansion settings, graph store, etc.
			const storeKeys = [
				"academic-explorer-layout-store",
				"academic-explorer-expansion-settings",
				"academic-explorer-graph-store",
			];

			for (const key of storeKeys) {
				try {
					localStorage.removeItem(key);
					logger.debug("ui", `Cleared persisted store: ${key}`, { key }, "SettingsSection");
				} catch (error) {
					logger.warn("ui", `Failed to clear store: ${key}`, { key, error }, "SettingsSection");
				}
			}

			// Reset layout store to defaults
			useLayoutStore.persist.clearStorage();

			// Clear app metadata
			await clearAppMetadata();

			logger.debug("ui", "User preferences reset completed", {}, "SettingsSection");

			notifications.show({
				title: "Preferences Reset",
				message: "User preferences have been reset to defaults. Please reload the page to see changes.",
				color: "green",
				icon: <IconRefresh size={16} />,
			});

		} catch (error) {
			logError("Failed to reset user preferences", error, "SettingsSection");
			notifications.show({
				title: "Reset Failed",
				message: "Failed to reset user preferences. Please try again.",
				color: "red",
				icon: <IconAlertTriangle size={16} />,
			});
		} finally {
			setResetState(prev => ({ ...prev, resettingPreferences: false }));
		}
	};

	/**
	 * Clear all cache and user data
	 */
	const handleClearAllData = async (): Promise<void> => {
		setResetState(prev => ({ ...prev, clearingCache: true }));

		try {
			logger.debug("ui", "Starting complete data reset", {}, "SettingsSection");

			// Clear TanStack Query cache
			queryClient.clear();

			// Clear all cache layers (IndexedDB, localStorage cache, memory)
			const result = await clearAllCacheLayers();

			logger.debug("ui", "Cache layers cleared", {
				clearedLayers: result.clearedLayers,
				errors: result.errors
			}, "SettingsSection");

			// Clear app metadata
			await clearAppMetadata();

			// Clear all localStorage data (including persisted stores)
			const localStorageKeys = Object.keys(localStorage);
			for (const key of localStorageKeys) {
				if (key.startsWith("academic-explorer-") || key.startsWith("mantine-")) {
					try {
						localStorage.removeItem(key);
					} catch (error) {
						logger.warn("ui", `Failed to clear localStorage key: ${key}`, { key, error }, "SettingsSection");
					}
				}
			}

			logger.debug("ui", "Complete data reset completed", {}, "SettingsSection");

			notifications.show({
				title: "Data Cleared",
				message: "All cache and user data have been cleared. Please reload the page to see changes.",
				color: "green",
				icon: <IconTrash size={16} />,
			});

		} catch (error) {
			logError("Failed to clear cache and user data", error, "SettingsSection");
			notifications.show({
				title: "Clear Failed",
				message: "Failed to clear cache and user data. Please try again.",
				color: "red",
				icon: <IconAlertTriangle size={16} />,
			});
		} finally {
			setResetState(prev => ({ ...prev, clearingCache: false }));
		}
	};

	return (
		<Stack gap="md">
			<Group gap="xs">
				<IconSettings size={16} />
				<Text size="sm" fw={500}>User Preferences</Text>
			</Group>

			<Alert
				icon={<IconAlertTriangle size={16} />}
				title="Warning"
				color="yellow"
				variant="light"
			>
				These actions will modify or clear your saved preferences and data.
				You may need to reload the page after making changes.
			</Alert>

			<Stack gap="sm">
				<Button
					variant="outline"
					leftSection={<IconRefresh size={16} />}
					onClick={() => void handleResetPreferences()}
					loading={resetState.resettingPreferences}
					disabled={resetState.clearingCache}
					fullWidth
				>
					Reset User Preferences
				</Button>

				<Text size="xs" c="dimmed">
					Reset layout, expansion settings, and other user preferences to default values.
				</Text>

				<Button
					variant="outline"
					color="red"
					leftSection={<IconTrash size={16} />}
					onClick={() => void handleClearAllData()}
					loading={resetState.clearingCache}
					disabled={resetState.resettingPreferences}
					fullWidth
				>
					Clear All Cache & User Data
				</Button>

				<Text size="xs" c="dimmed">
					Clear all cached API data, user preferences, and application state.
					This will reset the app to a fresh state.
				</Text>
			</Stack>
		</Stack>
	);
};