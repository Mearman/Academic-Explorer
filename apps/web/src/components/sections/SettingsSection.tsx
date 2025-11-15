/**
 * Settings section for user preferences and data management
 */

import React from "react";
import {
  Button,
  Stack,
  Text,
  Alert,
  Group,
  TextInput,
  Tooltip,
  Divider,
} from "@mantine/core";
import {
  IconTrash,
  IconRefresh,
  IconSettings,
  IconAlertTriangle,
  IconMail,
  IconCheck,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllCacheLayers } from "@academic-explorer/utils/cache";
import { clearAppMetadata } from "@academic-explorer/utils/cache";
import { useLayoutStore } from "@/stores/layout-store";
import { useSettingsStore, usePolitePoolEmail, settingsStoreInstance } from "@/stores/settings-store";
import { updateOpenAlexEmail } from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils/logger";
import { XpacToggle } from "@academic-explorer/ui";

interface ResetState {
  clearingCache: boolean;
  resettingPreferences: boolean;
}

export const SettingsSection: React.FC = () => {
  const [resetState, setResetState] = React.useState<ResetState>({
    clearingCache: false,
    resettingPreferences: false,
  });

  // Settings store - using simplified API
  const politePoolEmail = usePolitePoolEmail();
  const { setPolitePoolEmail, isValidEmail } = useSettingsStore(
    (state) => state,
  );

  // Local state for xpac setting
  const [includeXpac, setIncludeXpac] = React.useState<boolean>(true);

  // Load includeXpac setting from store on mount
  React.useEffect(() => {
    const loadXpacSetting = async () => {
      const settings = await settingsStoreInstance.getSettings();
      setIncludeXpac(settings.includeXpac);
    };
    void loadXpacSetting();
  }, []);

  // Local state for email editing
  const [localEmail, setLocalEmail] = React.useState(politePoolEmail);
  const [isEditingEmail, setIsEditingEmail] = React.useState(false);
  const [showEmailValidation, setShowEmailValidation] = React.useState(false);

  const queryClient = useQueryClient();

  // Sync local email state with store
  React.useEffect(() => {
    setLocalEmail(politePoolEmail);
  }, [politePoolEmail]);

  const handleEmailChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setLocalEmail(value);
      setShowEmailValidation(value.length > 0);
    },
    [],
  );

  // Helper function to update email configuration
  const updateEmailConfig = React.useCallback(
    async (email: string) => {
      await setPolitePoolEmail(email);
      updateOpenAlexEmail(email);
    },
    [setPolitePoolEmail],
  );

  // Helper function to show email update notification
  const showEmailUpdateNotification = React.useCallback((email: string) => {
    const message = email
      ? "OpenAlex polite pool email has been configured."
      : "OpenAlex polite pool email has been cleared.";

    notifications.show({
      title: "Email Updated",
      message,
      color: "green",
      icon: <IconCheck size={16} />,
    });
  }, []);

  // Helper function to log email save
  const logEmailSave = React.useCallback(
    (email: string) => {
      logger.debug("settings", "Email saved successfully", {
        hasEmail: email.length > 0,
        isValid: isValidEmail(email),
      });
    },
    [isValidEmail],
  );

  const handleEmailSave = React.useCallback(async () => {
    const trimmedEmail = localEmail.trim();
    if (trimmedEmail === "" || isValidEmail(trimmedEmail)) {
      await updateEmailConfig(trimmedEmail);
      setIsEditingEmail(false);
      setShowEmailValidation(false);
      logEmailSave(trimmedEmail);
      showEmailUpdateNotification(trimmedEmail);
    }
  }, [
    localEmail,
    isValidEmail,
    updateEmailConfig,
    logEmailSave,
    showEmailUpdateNotification,
  ]);

  const handleEmailCancel = React.useCallback(() => {
    setLocalEmail(politePoolEmail);
    setIsEditingEmail(false);
    setShowEmailValidation(false);
    logger.debug("settings", "Email edit cancelled");
  }, [politePoolEmail]);

  const handleEmailKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleEmailSave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleEmailCancel();
      }
    },
    [handleEmailSave, handleEmailCancel],
  );

  const handleXpacToggle = React.useCallback(async (value: boolean) => {
    setIncludeXpac(value);
    await settingsStoreInstance.setIncludeXpac(value);
    logger.debug("settings", "Xpac setting updated", { includeXpac: value });

    notifications.show({
      title: "Setting Updated",
      message: value
        ? "Extended research outputs (xpac) enabled"
        : "Extended research outputs (xpac) disabled",
      color: "blue",
      icon: <IconCheck size={16} />,
    });
  }, []);

  /**
   * Reset user preferences to defaults
   */
  const handleResetPreferences = async (): Promise<void> => {
    setResetState((prev) => ({ ...prev, resettingPreferences: true }));

    try {
      logger.debug(
        "ui",
        "Starting user preferences reset",
        {},
        "SettingsSection",
      );

      // Clear Zustand persisted stores
      // This will reset layout store, expansion settings, graph store, etc.
      const storeKeys = [
        "layout-state",
        "expansion-settings-state",
        "graph-store-state",
      ];

      for (const key of storeKeys) {
        try {
          localStorage.removeItem(key);
          logger.debug(
            "ui",
            `Cleared persisted store: ${key}`,
            { key },
            "SettingsSection",
          );
        } catch (error) {
          logger.warn(
            "ui",
            `Failed to clear store: ${key}`,
            { key, error },
            "SettingsSection",
          );
        }
      }

      // Layout store state is automatically cleared via localStorage removal
      // The Dexie database will be cleared when the browser is refreshed

      // Clear app metadata
      await clearAppMetadata();

      logger.debug(
        "ui",
        "User preferences reset completed",
        {},
        "SettingsSection",
      );

      notifications.show({
        title: "Preferences Reset",
        message:
          "User preferences have been reset to defaults. Please reload the page to see changes.",
        color: "green",
        icon: <IconRefresh size={16} />,
      });
    } catch (error) {
      logger.error("ui", "Failed to reset user preferences", { error });
      notifications.show({
        title: "Reset Failed",
        message: "Failed to reset user preferences. Please try again.",
        color: "red",
        icon: <IconAlertTriangle size={16} />,
      });
    } finally {
      setResetState((prev) => ({ ...prev, resettingPreferences: false }));
    }
  };

  // Helper function to clear query cache
  const clearQueryCache = () => {
    queryClient.clear();
    logger.debug("ui", "TanStack Query cache cleared", {}, "SettingsSection");
  };

  // Helper function to clear cache layers
  const clearCacheLayers = async () => {
    const result = await clearAllCacheLayers();

    const isCacheResult = (
      value: unknown,
    ): value is { clearedLayers?: string[]; errors?: unknown[] } => {
      return value !== null && typeof value === "object";
    };

    logger.debug("ui", "Cache layers cleared", {
      clearedLayers: isCacheResult(result) ? (result.clearedLayers ?? []) : [],
      errors: isCacheResult(result) ? (result.errors ?? []) : [],
    });
  };

  // Helper function to clear app metadata
  const clearMetadata = async () => {
    await clearAppMetadata();
    logger.debug("ui", "App metadata cleared", {}, "SettingsSection");
  };

  // Helper function to clear localStorage data
  const clearLocalStorageData = () => {
    const localStorageKeys = Object.keys(localStorage);
    for (const key of localStorageKeys) {
      if (key.startsWith("academic-explorer-") || key.startsWith("mantine-")) {
        try {
          localStorage.removeItem(key);
          logger.debug(
            "ui",
            `Cleared localStorage key: ${key}`,
            { key },
            "SettingsSection",
          );
        } catch (error) {
          logger.warn(
            "ui",
            `Failed to clear localStorage key: ${key}`,
            { key, error },
            "SettingsSection",
          );
        }
      }
    }
  };

  // Helper function to show success notification
  const showSuccessNotification = () => {
    notifications.show({
      title: "Data Cleared",
      message:
        "All cache and user data have been cleared. Please reload the page to see changes.",
      color: "green",
      icon: <IconTrash size={16} />,
    });
  };

  // Helper function to show error notification
  const showErrorNotification = (error: unknown) => {
    logger.error("ui", "Failed to clear cache and user data", { error });
    notifications.show({
      title: "Clear Failed",
      message: "Failed to clear cache and user data. Please try again.",
      color: "red",
      icon: <IconAlertTriangle size={16} />,
    });
  };

  /**
   * Clear all cache and user data
   */
  const handleClearAllData = async (): Promise<void> => {
    setResetState((prev) => ({ ...prev, clearingCache: true }));

    try {
      logger.debug("ui", "Starting complete data reset", {}, "SettingsSection");

      clearQueryCache();
      await clearCacheLayers();
      await clearMetadata();
      clearLocalStorageData();

      logger.debug(
        "ui",
        "Complete data reset completed",
        {},
        "SettingsSection",
      );
      showSuccessNotification();
    } catch (error) {
      showErrorNotification(error);
    } finally {
      setResetState((prev) => ({ ...prev, clearingCache: false }));
    }
  };

  const isEmailValid = showEmailValidation ? isValidEmail(localEmail) : true;
  const hasStoredEmail =
    politePoolEmail.length > 0 && isValidEmail(politePoolEmail);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <IconSettings size={16} />
        <Text size="sm" fw={500}>
          User Preferences
        </Text>
      </Group>

      {/* OpenAlex Polite Pool Email Configuration */}
      <Stack gap="sm">
        <Group gap="xs">
          <IconMail size={16} />
          <Text size="sm" fw={500}>
            OpenAlex Polite Pool
          </Text>
          <Tooltip
            label="Providing an email enables faster response times from the OpenAlex API through their polite pool"
            position="right"
            multiline
            w={200}
          >
            <IconInfoCircle
              size={12}
              style={{ color: "var(--mantine-color-dimmed)" }}
            />
          </Tooltip>
        </Group>

        {!isEditingEmail ? (
          <Group gap="sm">
            <Text size="sm" {...(hasStoredEmail ? {} : { c: "dimmed" })}>
              {hasStoredEmail ? politePoolEmail : "No email configured"}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setIsEditingEmail(true);
              }}
            >
              {hasStoredEmail ? "Edit" : "Configure"}
            </Button>
          </Group>
        ) : (
          <Stack gap="xs">
            <TextInput
              placeholder="your.email@example.com"
              value={localEmail}
              onChange={handleEmailChange}
              onKeyDown={handleEmailKeyDown}
              error={
                showEmailValidation && !isEmailValid
                  ? "Please enter a valid email address"
                  : undefined
              }
              rightSection={
                showEmailValidation ? (
                  isEmailValid ? (
                    <IconCheck
                      size={16}
                      style={{ color: "var(--mantine-color-green-6)" }}
                    />
                  ) : (
                    <IconX
                      size={16}
                      style={{ color: "var(--mantine-color-red-6)" }}
                    />
                  )
                ) : null
              }
            />
            <Group gap="sm">
              <Button
                variant="light"
                size="xs"
                onClick={handleEmailSave}
                disabled={showEmailValidation && !isEmailValid}
                leftSection={<IconCheck size={14} />}
              >
                Save
              </Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleEmailCancel}
                leftSection={<IconX size={14} />}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        )}

        <Text size="xs" c="dimmed">
          Your email is used only for OpenAlex API requests to enable faster
          response times. It is not stored remotely or shared with third
          parties.
        </Text>
      </Stack>

      <Divider />

      {/* Xpac Toggle */}
      <XpacToggle
        value={includeXpac}
        onChange={handleXpacToggle}
        showDescription={true}
      />

      <Divider />

      <Alert
        icon={<IconAlertTriangle size={16} />}
        title="Warning"
        color="yellow"
        variant="light"
      >
        These actions will modify or clear your saved preferences and data. You
        may need to reload the page after making changes.
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
          Reset layout, expansion settings, and other user preferences to
          default values.
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
