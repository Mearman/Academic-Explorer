/**
 * Settings store for application configuration
 * Pure Dexie implementation replacing Zustand + localStorage hybrid
 * Manages user settings with IndexedDB persistence
 */

import Dexie, { type Table } from "dexie";
import { logger } from "@academic-explorer/utils/logger";

// Database schema
interface SettingsRecord {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

// Dexie database class
class SettingsDB extends Dexie {
  settings!: Table<SettingsRecord>;

  constructor() {
    super("academic-explorer-settings");

    this.version(1).stores({
      settings: "++id, key, updatedAt",
    });
  }
}

// Singleton instance
let dbInstance: SettingsDB | null = null;

const getDB = (): SettingsDB => {
  dbInstance ??= new SettingsDB();
  return dbInstance;
};

// Settings state interface
interface SettingsState {
  /** Email for OpenAlex polite pool */
  politePoolEmail: string;
}

// Default values
const DEFAULT_SETTINGS: SettingsState = {
  politePoolEmail: "",
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Settings keys for storage
const SETTINGS_KEYS = {
  POLITE_POOL_EMAIL: "politePoolEmail",
} as const;

/**
 * Pure Dexie settings store service
 */
class SettingsStore {
  private db: SettingsDB;
  private logger = logger;

  constructor() {
    this.db = getDB();
  }

  /**
   * Get all settings
   */
  async getSettings(): Promise<SettingsState> {
    try {
      const records = await this.db.settings.toArray();
      const settings: Partial<SettingsState> = { ...DEFAULT_SETTINGS };

      // Load stored values
      for (const record of records) {
        if (record.key === SETTINGS_KEYS.POLITE_POOL_EMAIL) {
          settings.politePoolEmail = record.value;
        }
      }

      return settings as SettingsState;
    } catch (error) {
      this.logger?.error("settings", "Failed to load settings", { error });
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Update polite pool email
   */
  async setPolitePoolEmail(email: string): Promise<void> {
    try {
      await this.db.settings.put({
        key: SETTINGS_KEYS.POLITE_POOL_EMAIL,
        value: email,
        updatedAt: new Date(),
      });

      this.logger.debug("settings", "Updated polite pool email", {
        hasEmail: email.length > 0,
        isValid: this.isValidEmail(email),
      });
    } catch (error) {
      this.logger?.error("settings", "Failed to update polite pool email", {
        email,
        error,
      });
      throw error;
    }
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      await this.db.settings.clear();
      this.logger.debug("settings", "Reset all settings to defaults");
    } catch (error) {
      this.logger?.error("settings", "Failed to reset settings", { error });
      throw error;
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim());
  }

  /**
   * Get current polite pool email
   */
  async getPolitePoolEmail(): Promise<string> {
    const settings = await this.getSettings();
    return settings.politePoolEmail;
  }

  /**
   * Check if a valid email is configured
   */
  async hasValidEmail(): Promise<boolean> {
    const email = await this.getPolitePoolEmail();
    return this.isValidEmail(email);
  }

  /**
   * Migrate from old storage (localStorage/IndexedDB hybrid)
   * This should be called once during the transition
   */
  async migrateFromOldStorage(): Promise<void> {
    try {
      // Check if migration already happened
      const migrationKey = "migration-completed";
      const existingMigration = await this.db.settings.get({
        key: migrationKey,
      });

      if (existingMigration) {
        this.logger.debug("settings", "Migration already completed");
        return;
      }

      // Try to load from old localStorage
      let migratedData = false;

      if (typeof localStorage !== "undefined") {
        try {
          const oldEmail = localStorage.getItem("settings-state");
          if (oldEmail) {
            // Parse the old Zustand persisted state
            const parsed = JSON.parse(oldEmail);
            const email = parsed?.state?.politePoolEmail;

            if (email && typeof email === "string") {
              await this.setPolitePoolEmail(email);
              migratedData = true;
              this.logger.debug("settings", "Migrated email from localStorage");
            }
          }
        } catch (error) {
          this.logger?.warn("settings", "Failed to migrate from localStorage", {
            error,
          });
        }
      }

      // Mark migration as completed
      await this.db.settings.put({
        key: migrationKey,
        value: "true",
        updatedAt: new Date(),
      });

      this.logger.debug("settings", "Migration completed", { migratedData });
    } catch (error) {
      this.logger?.error("settings", "Migration failed", { error });
    }
  }
}

// Singleton instance
export const settingsStore = new SettingsStore();

// Initialize migration on first load (only in browser)
if (typeof window !== "undefined") {
  void settingsStore.migrateFromOldStorage();
}

// Zustand-compatible API for backward compatibility
// This provides the same interface as the old Zustand store

interface SettingsStoreState {
  politePoolEmail: string;
}

interface SettingsStoreActions {
  setPolitePoolEmail: (email: string) => void;
  resetSettings: () => void;
  isValidEmail: (email: string) => boolean;
}

interface SettingsStoreInterface {
  getState: () => SettingsStoreState;
  setState: (
    updater: (state: SettingsStoreState) => SettingsStoreState,
  ) => void;
  subscribe: (listener: (state: SettingsStoreState) => void) => () => void;
}

// Global state for Zustand compatibility
let currentState: SettingsStoreState = { ...DEFAULT_SETTINGS };
const listeners = new Set<(state: SettingsStoreState) => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentState));
};

// Initialize state from Dexie on first load
let initialized = false;
const initializeState = async () => {
  if (initialized) return;
  try {
    const settings = await settingsStore.getSettings();
    currentState = { politePoolEmail: settings.politePoolEmail };
    notifyListeners();
    initialized = true;
  } catch (error) {
    logger?.error("settings", "Failed to initialize Zustand-compatible state", {
      error,
    });
  }
};

// Actions that update both Dexie and Zustand state
const actions: SettingsStoreActions = {
  setPolitePoolEmail: async (email: string) => {
    await settingsStore.setPolitePoolEmail(email);
    currentState = { ...currentState, politePoolEmail: email };
    notifyListeners();
  },

  resetSettings: async () => {
    await settingsStore.resetSettings();
    currentState = { ...DEFAULT_SETTINGS };
    notifyListeners();
  },

  isValidEmail: (email: string) => settingsStore.isValidEmail(email),
};

// Zustand-compatible store interface
const zustandStore: SettingsStoreInterface = {
  getState: () => currentState,

  setState: (updater) => {
    currentState = updater(currentState);
    notifyListeners();
  },

  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Initialize on first access
if (typeof window !== "undefined") {
  void initializeState();
}

// Exports for backward compatibility
export const useSettingsStore = () => zustandStore;

export const settingsActions = actions;

// Additional hooks for convenience
export const usePolitePoolEmail = (): string => {
  // Initialize state if not done yet
  if (!initialized && typeof window !== "undefined") {
    void initializeState();
  }
  return currentState.politePoolEmail;
};

export const useHasValidEmail = (): boolean => {
  // Initialize state if not done yet
  if (!initialized && typeof window !== "undefined") {
    void initializeState();
  }
  return settingsStore.isValidEmail(currentState.politePoolEmail);
};
