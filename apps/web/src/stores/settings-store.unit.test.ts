/**
 * @vitest-environment jsdom
 */

/**
 * Settings store unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  settingsStoreInstance,
  settingsActions,
} from "./settings-store";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Use the existing store instance for testing
const testStoreInstance = settingsStoreInstance;

describe("SettingsStore", () => {
  beforeEach(async () => {
    // Clear store state before each test
    await testStoreInstance.resetSettings();
    // Clear localStorage mock calls
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("politePoolEmail", () => {
    it("should have empty email initially", async () => {
      const settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });

    it("should set polite pool email", async () => {
      await testStoreInstance.setPolitePoolEmail("test@example.com");
      const settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");
    });

    it("should clear polite pool email", async () => {
      await testStoreInstance.setPolitePoolEmail("test@example.com");
      let settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");

      await testStoreInstance.setPolitePoolEmail("");
      settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });
  });

  describe("email validation", () => {
    it("should validate correct email", () => {
      expect(settingsActions.isValidEmail("test@example.com")).toBe(true);
    });

    it("should reject invalid email", () => {
      expect(settingsActions.isValidEmail("invalid")).toBe(false);
      expect(settingsActions.isValidEmail("")).toBe(false);
      expect(settingsActions.isValidEmail("test@")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(settingsActions.isValidEmail(" test@example.com ")).toBe(true); // trims whitespace
      expect(settingsActions.isValidEmail("test@example.com.")).toBe(false);
    });
  });

  describe("resetSettings", () => {
    it("should reset email to empty", async () => {
      await testStoreInstance.setPolitePoolEmail("test@example.com");
      let settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");

      await testStoreInstance.resetSettings();
      settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });
  });

  describe("state access", () => {
    it("should provide polite pool email through state", async () => {
      await testStoreInstance.setPolitePoolEmail("test@example.com");
      const settings = await testStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");
    });

    it("should provide valid email check through actions", () => {
      expect(settingsActions.isValidEmail("test@example.com")).toBe(true);
      expect(settingsActions.isValidEmail("invalid")).toBe(false);
    });
  });
});
