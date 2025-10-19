/**
 * @vitest-environment jsdom
 */

/**
 * Settings store unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSettingsStore, settingsActions } from "./settings-store";

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

describe("SettingsStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    useSettingsStore.getState().resetSettings();
    // Clear localStorage mock calls
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("politePoolEmail", () => {
    it("should have empty email initially", () => {
      expect(useSettingsStore.getState().politePoolEmail).toBe("");
    });

    it("should set polite pool email", () => {
      const { setPolitePoolEmail } = settingsActions;

      setPolitePoolEmail("test@example.com");
      expect(useSettingsStore.getState().politePoolEmail).toBe("test@example.com");
    });

    it("should clear polite pool email", () => {
      const { setPolitePoolEmail } = settingsActions;

      setPolitePoolEmail("test@example.com");
      expect(useSettingsStore.getState().politePoolEmail).toBe("test@example.com");

      setPolitePoolEmail("");
      expect(useSettingsStore.getState().politePoolEmail).toBe("");
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
    it("should reset email to empty", () => {
      const { setPolitePoolEmail } = settingsActions;

      setPolitePoolEmail("test@example.com");
      expect(useSettingsStore.getState().politePoolEmail).toBe("test@example.com");

      settingsActions.resetSettings();
      expect(useSettingsStore.getState().politePoolEmail).toBe("");
    });
  });
  });

   describe("state access", () => {
     it("should provide polite pool email through state", () => {
       const { setPolitePoolEmail } = settingsActions;

       setPolitePoolEmail("test@example.com");
       expect(useSettingsStore.getState().politePoolEmail).toBe("test@example.com");
     });

     it("should provide valid email check through actions", () => {
       expect(settingsActions.isValidEmail("test@example.com")).toBe(true);
       expect(settingsActions.isValidEmail("invalid")).toBe(false);
     });
   });
});
