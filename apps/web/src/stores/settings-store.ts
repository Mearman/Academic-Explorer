/**
 * Settings store for application configuration
 * Direct Dexie implementation without Zustand compatibility
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+(?:\.[^\s@]+)+$/;

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
    const trimmed = email.trim();
    return EMAIL_REGEX.test(trimmed) && !trimmed.endsWith(".");
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
const dexieStore = new SettingsStore();

// Initialize migration on first load (only in browser)
if (typeof window !== "undefined") {
  void dexieStore.migrateFromOldStorage();
}

// Export the Dexie store instance for direct usage
export { dexieStore as settingsStore };
export { SettingsStore };
export const settingsStoreInstance = dexieStore;

// Simple hook for components - no complex state management
export const usePolitePoolEmail = (): string => {
  // This can be enhanced with React state management if needed
  return DEFAULT_SETTINGS.politePoolEmail;
};

export const useHasValidEmail = (): boolean => {
  const email = usePolitePoolEmail();
  return dexieStore.isValidEmail(email);
};

// Direct function exports for when you need explicit calls
export const settingsActions = {
  setPolitePoolEmail: (email: string) => dexieStore.setPolitePoolEmail(email),
  resetSettings: () => dexieStore.resetSettings(),
  isValidEmail: (email: string) => dexieStore.isValidEmail(email),
  getPolitePoolEmail: () => dexieStore.getPolitePoolEmail(),
  hasValidEmail: () => dexieStore.hasValidEmail(),
};

// Zustand-style compatibility - simple selector pattern
export const useSettingsStore = <T>(selector: (state: typeof settingsActions & { politePoolEmail: string }) => T): T => {
  const state = {
    ...settingsActions,
    politePoolEmail: usePolitePoolEmail(),
  };
  return selector(state);
};
