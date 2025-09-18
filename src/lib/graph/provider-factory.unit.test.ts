/**
 * Unit tests for graph provider factory
 * Tests provider creation, availability checking, and error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	createGraphProvider,
	getAvailableProviders,
	isProviderSupported
} from "./provider-factory";
import type { ProviderType } from "./types";

// Mock the XYFlowProvider to avoid importing complex dependencies
vi.mock("./providers/xyflow/xyflow-provider", () => ({
	XYFlowProvider: vi.fn().mockImplementation(() => ({
		// Mock the basic provider interface
		type: "xyflow",
		initialize: vi.fn(),
		destroy: vi.fn(),
		render: vi.fn(),
		updateData: vi.fn(),
		getLayout: vi.fn(),
		setLayout: vi.fn()
	}))
}));

const { XYFlowProvider } = await import("./providers/xyflow/xyflow-provider");

describe("createGraphProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	describe("supported providers", () => {
		it("should create XYFlowProvider for xyflow type", () => {
			const provider = createGraphProvider("xyflow");

			expect(XYFlowProvider).toHaveBeenCalled();
			expect(provider).toBeDefined();
			expect(provider.type).toBe("xyflow");
		});

		it("should create new instance for each call", () => {
			const provider1 = createGraphProvider("xyflow");
			const provider2 = createGraphProvider("xyflow");

			expect(XYFlowProvider).toHaveBeenCalledTimes(2);
			expect(provider1).not.toBe(provider2);
		});

		it("should return provider with required interface methods", () => {
			const provider = createGraphProvider("xyflow");

			// Check that the provider has the expected interface
			expect(provider).toHaveProperty("type");
			expect(provider).toHaveProperty("initialize");
			expect(provider).toHaveProperty("destroy");
			expect(provider).toHaveProperty("render");
			expect(provider).toHaveProperty("updateData");
			expect(provider).toHaveProperty("getLayout");
			expect(provider).toHaveProperty("setLayout");
		});
	});

	describe("unsupported providers", () => {
		it("should throw error for d3 provider (not implemented)", () => {
			expect(() => createGraphProvider("d3")).toThrow("D3 provider not yet implemented");
		});

		it("should throw error for cytoscape provider (not implemented)", () => {
			expect(() => createGraphProvider("cytoscape")).toThrow("Cytoscape provider not yet implemented");
		});

		it("should throw error for unknown provider type", () => {
			const invalidType = "unknown" as ProviderType;
			expect(() => createGraphProvider(invalidType)).toThrow("Unknown provider type: unknown");
		});

		it("should handle null input gracefully", () => {
			expect(() => createGraphProvider(null as any)).toThrow("Unknown provider type: null");
		});

		it("should handle undefined input gracefully", () => {
			expect(() => createGraphProvider(undefined as any)).toThrow("Unknown provider type: undefined");
		});

		it("should handle empty string input gracefully", () => {
			const emptyType = "" as ProviderType;
			expect(() => createGraphProvider(emptyType)).toThrow("Unknown provider type: ");
		});

		it("should handle numeric input gracefully", () => {
			expect(() => createGraphProvider(123 as any)).toThrow("Unknown provider type: 123");
		});

		it("should handle object input gracefully", () => {
			expect(() => createGraphProvider({} as any)).toThrow("Unknown provider type: [object Object]");
		});
	});

	describe("provider type validation", () => {
		it("should handle case-sensitive provider types", () => {
			expect(() => createGraphProvider("XYFlow" as ProviderType)).toThrow("Unknown provider type: XYFlow");
			expect(() => createGraphProvider("XYFLOW" as ProviderType)).toThrow("Unknown provider type: XYFLOW");
			expect(() => createGraphProvider("xyFlow" as ProviderType)).toThrow("Unknown provider type: xyFlow");
		});

		it("should handle whitespace in provider types", () => {
			expect(() => createGraphProvider(" xyflow " as ProviderType)).toThrow("Unknown provider type:  xyflow ");
			expect(() => createGraphProvider("xy flow" as ProviderType)).toThrow("Unknown provider type: xy flow");
		});
	});
});

describe("getAvailableProviders", () => {
	describe("return value structure", () => {
		it("should return an array", () => {
			const providers = getAvailableProviders();
			expect(Array.isArray(providers)).toBe(true);
		});

		it("should return array with at least one provider", () => {
			const providers = getAvailableProviders();
			expect(providers.length).toBeGreaterThan(0);
		});

		it("should include xyflow provider", () => {
			const providers = getAvailableProviders();
			expect(providers).toContain("xyflow");
		});

		it("should return new array instance each time", () => {
			const providers1 = getAvailableProviders();
			const providers2 = getAvailableProviders();

			expect(providers1).not.toBe(providers2);
			expect(providers1).toEqual(providers2);
		});

		it("should return array of strings", () => {
			const providers = getAvailableProviders();
			providers.forEach(provider => {
				expect(typeof provider).toBe("string");
			});
		});
	});

	describe("current implementation", () => {
		it("should return only xyflow provider currently", () => {
			const providers = getAvailableProviders();
			expect(providers).toEqual(["xyflow"]);
		});

		it("should not include unimplemented providers", () => {
			const providers = getAvailableProviders();
			expect(providers).not.toContain("d3");
			expect(providers).not.toContain("cytoscape");
		});

		it("should have consistent length", () => {
			const providers = getAvailableProviders();
			expect(providers).toHaveLength(1);
		});
	});

	describe("future extensibility", () => {
		it("should maintain consistent return type when providers are added", () => {
			const providers = getAvailableProviders();

			// All providers should be valid ProviderType values
			providers.forEach(provider => {
				expect(["xyflow", "d3", "cytoscape"]).toContain(provider);
			});
		});

		it("should not contain duplicate providers", () => {
			const providers = getAvailableProviders();
			const uniqueProviders = [...new Set(providers)];
			expect(providers).toEqual(uniqueProviders);
		});
	});
});

describe("isProviderSupported", () => {
	describe("supported provider types", () => {
		it("should return true for xyflow provider", () => {
			expect(isProviderSupported("xyflow")).toBe(true);
		});

		it("should have correct type guard behavior for xyflow", () => {
			const type = "xyflow";
			if (isProviderSupported(type)) {
				// TypeScript should narrow the type here
				expect(type).toBe("xyflow" satisfies ProviderType);
			}
		});
	});

	describe("unsupported provider types", () => {
		it("should return false for d3 provider (not implemented)", () => {
			expect(isProviderSupported("d3")).toBe(false);
		});

		it("should return false for cytoscape provider (not implemented)", () => {
			expect(isProviderSupported("cytoscape")).toBe(false);
		});

		it("should return false for unknown provider types", () => {
			expect(isProviderSupported("unknown")).toBe(false);
			expect(isProviderSupported("react-flow")).toBe(false);
			expect(isProviderSupported("vis.js")).toBe(false);
		});

		it("should return false for empty string", () => {
			expect(isProviderSupported("")).toBe(false);
		});

		it("should return false for whitespace", () => {
			expect(isProviderSupported(" ")).toBe(false);
			expect(isProviderSupported("  ")).toBe(false);
		});
	});

	describe("case sensitivity", () => {
		it("should be case-sensitive", () => {
			expect(isProviderSupported("XYFlow")).toBe(false);
			expect(isProviderSupported("XYFLOW")).toBe(false);
			expect(isProviderSupported("xyFlow")).toBe(false);
			expect(isProviderSupported("Xyflow")).toBe(false);
		});

		it("should not accept variations with whitespace", () => {
			expect(isProviderSupported(" xyflow")).toBe(false);
			expect(isProviderSupported("xyflow ")).toBe(false);
			expect(isProviderSupported(" xyflow ")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle null input gracefully", () => {
			expect(isProviderSupported(null as any)).toBe(false);
		});

		it("should handle undefined input gracefully", () => {
			expect(isProviderSupported(undefined as any)).toBe(false);
		});

		it("should handle numeric input gracefully", () => {
			expect(isProviderSupported(123 as any)).toBe(false);
		});

		it("should handle boolean input gracefully", () => {
			expect(isProviderSupported(true as any)).toBe(false);
			expect(isProviderSupported(false as any)).toBe(false);
		});

		it("should handle object input gracefully", () => {
			expect(isProviderSupported({} as any)).toBe(false);
			expect(isProviderSupported({ type: "xyflow" } as any)).toBe(false);
		});

		it("should handle array input gracefully", () => {
			expect(isProviderSupported([] as any)).toBe(false);
			expect(isProviderSupported(["xyflow"] as any)).toBe(false);
		});
	});

	describe("type guard functionality", () => {
		it("should correctly narrow type for valid providers", () => {
			const input: string = "xyflow";

			if (isProviderSupported(input)) {
				// TypeScript should recognize input as ProviderType here
				const provider = createGraphProvider(input); // Should not error
				expect(provider).toBeDefined();
			}
		});

		it("should not narrow type for invalid providers", () => {
			const input: string = "invalid";

			if (isProviderSupported(input)) {
				// This block should not execute
				expect.fail("isProviderSupported should return false for invalid input");
			} else {
				// TypeScript should still treat input as string here
				expect(typeof input).toBe("string");
			}
		});
	});
});

describe("integration between factory functions", () => {
	describe("function consistency", () => {
		it("should ensure createGraphProvider works with all available providers", () => {
			const availableProviders = getAvailableProviders();

			availableProviders.forEach(providerType => {
				expect(() => createGraphProvider(providerType)).not.toThrow();
				const provider = createGraphProvider(providerType);
				expect(provider).toBeDefined();
			});
		});

		it("should ensure isProviderSupported returns true for all available providers", () => {
			const availableProviders = getAvailableProviders();

			availableProviders.forEach(providerType => {
				expect(isProviderSupported(providerType)).toBe(true);
			});
		});

		it("should ensure isProviderSupported returns false for unavailable providers", () => {
			const allPossibleProviders: ProviderType[] = ["xyflow", "d3", "cytoscape"];
			const availableProviders = getAvailableProviders();
			const unavailableProviders = allPossibleProviders.filter(
				provider => !availableProviders.includes(provider)
			);

			unavailableProviders.forEach(providerType => {
				expect(isProviderSupported(providerType)).toBe(false);
			});
		});
	});

	describe("workflow patterns", () => {
		it("should support typical usage pattern: check support then create", () => {
			const providerType = "xyflow";

			if (isProviderSupported(providerType)) {
				const provider = createGraphProvider(providerType);
				expect(provider).toBeDefined();
				expect(provider.type).toBe(providerType);
			}
		});

		it("should support dynamic provider selection from available list", () => {
			const availableProviders = getAvailableProviders();
			const selectedProvider = availableProviders[0];

			expect(isProviderSupported(selectedProvider)).toBe(true);
			const provider = createGraphProvider(selectedProvider);
			expect(provider).toBeDefined();
		});

		it("should provide error-safe provider creation workflow", () => {
			const userInput = "unknown-provider";

			if (isProviderSupported(userInput)) {
				// This should not execute for unknown provider
				expect.fail("Should not reach this point for unknown provider");
			} else {
				// Handle unsupported provider gracefully
				expect(() => createGraphProvider(userInput as ProviderType)).toThrow();
			}
		});
	});
});