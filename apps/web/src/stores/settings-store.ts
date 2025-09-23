/**
 * Settings store for application configuration
 * Manages user settings with localStorage persistence
 * Uses Zustand with Immer for state management
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { updateOpenAlexEmail } from "@academic-explorer/openalex-client";
import { createHybridStorage } from "@academic-explorer/shared-utils/storage";
import { logger } from "@academic-explorer/shared-utils/logger";

interface SettingsState {
  /** Email for OpenAlex polite pool */
  politePoolEmail: string;

  /** Actions */
  setPolitePoolEmail: (email: string) => void;
  resetSettings: () => void;

  /** Validation */
  isValidEmail: (email: string) => boolean;
}

const DEFAULT_EMAIL = "";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set, get) => ({
      politePoolEmail: DEFAULT_EMAIL,

      setPolitePoolEmail: (email: string) => {
        set((state) => {
          state.politePoolEmail = email;
        });

        logger.debug("settings", "Updated polite pool email", {
          hasEmail: email.length > 0,
          isValid: get().isValidEmail(email)
        });
      },

      resetSettings: () => {
        set((state) => {
          state.politePoolEmail = DEFAULT_EMAIL;
        });

        logger.debug("settings", "Reset all settings");
      },

      isValidEmail: (email: string): boolean => {
        if (!email || email.trim() === "") return false;
        return EMAIL_REGEX.test(email.trim());
      }
    })),
    {
      name: "academic-explorer-settings",
      storage: createJSONStorage(() => createHybridStorage()),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Initialize OpenAlex client with stored email after hydration
          updateOpenAlexEmail(state.politePoolEmail);

          logger.debug("settings", "Rehydrated settings from localStorage", {
            hasEmail: state.politePoolEmail.length > 0,
            isValidEmail: state.isValidEmail(state.politePoolEmail)
          });
        }
      }
    }
  )
);

// Export a hook for getting the current email
export const usePolitePoolEmail = () => {
  return useSettingsStore((state) => state.politePoolEmail);
};

// Export a hook for checking if email is configured
export const useHasValidEmail = () => {
  return useSettingsStore((state) =>
    state.isValidEmail(state.politePoolEmail)
  );
};