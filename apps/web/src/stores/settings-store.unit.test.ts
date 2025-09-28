/**
 * @vitest-environment jsdom
 */

/**
 * Settings store unit tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSettingsStore } from "./settings-store";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock
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
      const { politePoolEmail } = useSettingsStore.getState();
      expect(politePoolEmail).toBe("");
    });

    it("should set polite pool email", () => {
      const { setPolitePoolEmail } = useSettingsStore.getState();
      setPolitePoolEmail("test@example.com");

      const { politePoolEmail } = useSettingsStore.getState();
      expect(politePoolEmail).toBe("test@example.com");
    });

    it("should clear polite pool email", () => {
      const { setPolitePoolEmail } = useSettingsStore.getState();
      setPolitePoolEmail("test@example.com");
      setPolitePoolEmail("");

      const { politePoolEmail } = useSettingsStore.getState();
      expect(politePoolEmail).toBe("");
    });
  });

  describe("email validation", () => {
    it("should validate correct email", () => {
      const { isValidEmail } = useSettingsStore.getState();
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("simple@test.org")).toBe(true);
    });

    it("should reject invalid email", () => {
      const { isValidEmail } = useSettingsStore.getState();
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("user@domain")).toBe(false);
    });

    it("should handle edge cases", () => {
      const { isValidEmail } = useSettingsStore.getState();
      expect(isValidEmail("  test@example.com  ")).toBe(true); // Spaces are valid in email regex
      expect(isValidEmail("test@ex-ample.com")).toBe(true); // Hyphen in domain
      expect(isValidEmail("test.email@example-domain.com")).toBe(true);
    });
  });

  describe("resetSettings", () => {
    it("should reset email to empty", () => {
      const { setPolitePoolEmail, resetSettings } = useSettingsStore.getState();

      setPolitePoolEmail("test@example.com");
      expect(useSettingsStore.getState().politePoolEmail).toBe("test@example.com");

      resetSettings();
      expect(useSettingsStore.getState().politePoolEmail).toBe("");
    });
  });

  describe("state access", () => {
    it("should provide polite pool email through state", () => {
      const { setPolitePoolEmail } = useSettingsStore.getState();
      setPolitePoolEmail("hook@example.com");

      // Test direct state access (not hook)
      const email = useSettingsStore.getState().politePoolEmail;
      expect(email).toBe("hook@example.com");
    });

    it("should provide valid email check through state", () => {
      const { setPolitePoolEmail, isValidEmail } = useSettingsStore.getState();
      setPolitePoolEmail("valid@example.com");

      // Test direct state access (not hook)
      const hasValidEmail = isValidEmail(useSettingsStore.getState().politePoolEmail);
      expect(hasValidEmail).toBe(true);
    });
  });
});