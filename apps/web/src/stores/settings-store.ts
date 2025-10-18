/**
 * Settings store for application configuration
 * Manages user settings with localStorage persistence
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import { createTrackedStore } from "@academic-explorer/utils/state";
import { logger } from "@academic-explorer/utils/logger";

interface SettingsState {
  /** Email for OpenAlex polite pool */
  politePoolEmail: string;
}

interface SettingsActions {
  /** Actions */
  setPolitePoolEmail: (email: string) => void;
  resetSettings: () => void;

  /** Validation */
  isValidEmail: (email: string) => boolean;

  /** Index signature to satisfy constraint */
  [key: string]: (...args: never[]) => void;
}

const DEFAULT_EMAIL = "";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const { useStore: useSettingsStore } = createTrackedStore<
  SettingsState,
  SettingsActions
>({
  config: {
    name: "settings",
    initialState: {
      politePoolEmail: DEFAULT_EMAIL,
    },
    persist: {
      enabled: true,
      storage: "localstorage",
    },
  },
  actionsFactory: ({ set, get }) => ({
    setPolitePoolEmail: (email: string) => {
      set((state) => {
        state.politePoolEmail = email;
      });

      logger.debug("settings", "Updated polite pool email", {
        hasEmail: email.length > 0,
        isValid: get().isValidEmail(email),
      });
    },

    resetSettings: () => {
      set((state) => {
        state.politePoolEmail = DEFAULT_EMAIL;
      });
    },

    isValidEmail: (email: string) => EMAIL_REGEX.test(email.trim()),
  }),
});

export { useSettingsStore };

// Export a hook for getting the current email
export const usePolitePoolEmail = () => {
  return useSettingsStore((state) => state.politePoolEmail);
};

// Export a hook for checking if email is configured
export const useHasValidEmail = () => {
  return useSettingsStore((state) => state.isValidEmail(state.politePoolEmail));
};
