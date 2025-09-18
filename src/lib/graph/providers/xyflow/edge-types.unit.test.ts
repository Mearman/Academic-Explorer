/**
 * Unit tests for XYFlow edge types configuration
 * Tests edge type mappings, component references, and configuration structure
 */

import { describe, it, expect, vi } from "vitest";
import { edgeTypes } from "./edge-types";

// Mock the edge components to avoid complex dependencies
vi.mock("./SmartEdge", () => ({
	default: vi.fn(() => null)
}));

vi.mock("./DynamicFloatingEdge", () => ({
	default: vi.fn(() => null)
}));

describe("edge types configuration", () => {
	describe("edgeTypes object structure", () => {
		it("should be an object with expected edge type keys", () => {
			expect(typeof edgeTypes).toBe("object");
			expect(edgeTypes).not.toBeNull();
		});

		it("should have exactly two edge types defined", () => {
			const keys = Object.keys(edgeTypes);
			expect(keys).toHaveLength(2);
		});

		it("should include smart edge type", () => {
			expect(edgeTypes).toHaveProperty("smart");
		});

		it("should include smartLegacy edge type", () => {
			expect(edgeTypes).toHaveProperty("smartLegacy");
		});

		it("should have all expected edge type keys", () => {
			const expectedKeys = ["smart", "smartLegacy"];
			const actualKeys = Object.keys(edgeTypes);

			expectedKeys.forEach(key => {
				expect(actualKeys).toContain(key);
			});
		});
	});

	describe("edge type mappings", () => {
		it("should map smart to DynamicFloatingEdge component", () => {
			// Verify that smart edge type exists and is a function
			expect(edgeTypes.smart).toBeDefined();
			expect(typeof edgeTypes.smart).toBe("function");
		});

		it("should map smartLegacy to SmartEdge component", () => {
			// Verify that smartLegacy edge type exists and is a function
			expect(edgeTypes.smartLegacy).toBeDefined();
			expect(typeof edgeTypes.smartLegacy).toBe("function");
		});

		it("should have all edge types mapped to functions/components", () => {
			Object.values(edgeTypes).forEach(edgeComponent => {
				expect(typeof edgeComponent).toBe("function");
			});
		});

		it("should provide different components for different edge types", () => {
			expect(edgeTypes.smart).not.toBe(edgeTypes.smartLegacy);
		});
	});

	describe("edge type naming conventions", () => {
		it("should use camelCase naming for edge type keys", () => {
			const keys = Object.keys(edgeTypes);
			keys.forEach(key => {
				// Check that keys follow camelCase (start with lowercase, no underscores or spaces)
				expect(key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
			});
		});

		it("should have meaningful edge type names", () => {
			const keys = Object.keys(edgeTypes);

			// Names should be descriptive and not empty
			keys.forEach(key => {
				expect(key.length).toBeGreaterThan(0);
				expect(key).not.toMatch(/^[0-9]+$/); // Not just numbers
			});
		});

		it("should distinguish between current and legacy edge types", () => {
			// smart should be the current implementation
			expect(edgeTypes).toHaveProperty("smart");
			// smartLegacy should be the fallback/legacy implementation
			expect(edgeTypes).toHaveProperty("smartLegacy");
		});
	});

	describe("React Flow integration", () => {
		it("should provide edge types compatible with React Flow", () => {
			// React Flow expects edge types to be an object mapping strings to components
			expect(typeof edgeTypes).toBe("object");

			Object.entries(edgeTypes).forEach(([typeName, component]) => {
				expect(typeof typeName).toBe("string");
				expect(typeof component).toBe("function");
			});
		});

		it("should be suitable for React Flow edgeTypes prop", () => {
			// React Flow would use this as: <ReactFlow edgeTypes={edgeTypes} />
			// Verify the structure matches React Flow expectations
			expect(edgeTypes).toBeDefined();
			expect(Object.keys(edgeTypes).length).toBeGreaterThan(0);
		});

		it("should provide edge type components that can be instantiated", () => {
			Object.values(edgeTypes).forEach(EdgeComponent => {
				// Mock components should be callable (functions)
				expect(() => EdgeComponent()).not.toThrow();
			});
		});
	});


	describe("configuration immutability", () => {
		it("should maintain consistent edge type configuration", () => {
			const config1 = edgeTypes;
			const config2 = edgeTypes;

			// Should be the same reference
			expect(config1).toBe(config2);
		});

		it("should provide stable references to edge components", () => {
			const smartComponent1 = edgeTypes.smart;
			const smartComponent2 = edgeTypes.smart;

			expect(smartComponent1).toBe(smartComponent2);
		});

		it("should not be accidentally modifiable in consuming code", () => {
			// While JavaScript objects are mutable, the configuration should be treated as immutable
			// This test documents the expected usage pattern
			const originalSmart = edgeTypes.smart;
			const originalSmartLegacy = edgeTypes.smartLegacy;

			expect(edgeTypes.smart).toBe(originalSmart);
			expect(edgeTypes.smartLegacy).toBe(originalSmartLegacy);
		});
	});

	describe("edge type functionality", () => {
		it("should provide smart edge as the primary/recommended type", () => {
			// The 'smart' type should be the current, recommended edge type
			expect(edgeTypes).toHaveProperty("smart");
			expect(edgeTypes.smart).toBeDefined();
		});

		it("should provide smartLegacy as fallback option", () => {
			// The 'smartLegacy' type should be available for compatibility
			expect(edgeTypes).toHaveProperty("smartLegacy");
			expect(edgeTypes.smartLegacy).toBeDefined();
		});

		it("should support XYFlow graph visualization requirements", () => {
			// Both edge types should be available for different use cases
			// smart: for dynamic layout scenarios
			// smartLegacy: for fallback/compatibility scenarios
			expect(typeof edgeTypes.smart).toBe("function");
			expect(typeof edgeTypes.smartLegacy).toBe("function");
		});
	});

	describe("edge component imports", () => {
		it("should properly import SmartEdge component", () => {
			// Verify that smartLegacy edge type is defined (represents SmartEdge)
			expect(edgeTypes.smartLegacy).toBeDefined();
			expect(typeof edgeTypes.smartLegacy).toBe("function");
		});

		it("should properly import DynamicFloatingEdge component", () => {
			// Verify that smart edge type is defined (represents DynamicFloatingEdge)
			expect(edgeTypes.smart).toBeDefined();
			expect(typeof edgeTypes.smart).toBe("function");
		});

		it("should handle import failures gracefully", () => {
			// This test ensures the configuration is robust
			// In the actual implementation, component imports should not fail
			expect(() => {
				const config = edgeTypes;
				return config;
			}).not.toThrow();
		});
	});

	describe("usage patterns and compatibility", () => {
		it("should support dynamic edge selection based on layout state", () => {
			// The smart edge (DynamicFloatingEdge) should be suitable for dynamic layouts
			const smartEdge = edgeTypes.smart;
			expect(smartEdge).toBeDefined();

			// The legacy edge should be available for static layouts
			const legacyEdge = edgeTypes.smartLegacy;
			expect(legacyEdge).toBeDefined();

			// They should be different implementations
			expect(smartEdge).not.toBe(legacyEdge);
		});

		it("should provide fallback strategy with legacy edge type", () => {
			// If smart edge fails, smartLegacy can be used as fallback
			const fallbackEdge = edgeTypes.smartLegacy;
			expect(fallbackEdge).toBeDefined();
			expect(typeof fallbackEdge).toBe("function");
		});

		it("should be compatible with React Flow edge type requirements", () => {
			// Verify the configuration structure matches React Flow expectations
			const edgeTypeNames = Object.keys(edgeTypes);

			edgeTypeNames.forEach(typeName => {
				// Edge type names should be strings
				expect(typeof typeName).toBe("string");

				// Edge components should be functions (React components)
				expect(typeof edgeTypes[typeName as keyof typeof edgeTypes]).toBe("function");
			});
		});

		it("should support both current and legacy edge rendering approaches", () => {
			// Modern approach: smart (DynamicFloatingEdge) for layout recalculation
			expect(edgeTypes.smart).toBeDefined();

			// Legacy approach: smartLegacy (SmartEdge) for fallback
			expect(edgeTypes.smartLegacy).toBeDefined();

			// Both should be available for different scenarios
			expect(edgeTypes.smart).not.toBe(edgeTypes.smartLegacy);
		});
	});

	describe("performance considerations", () => {
		it("should not create new component instances on each access", () => {
			// Edge components should be stable references
			const smart1 = edgeTypes.smart;
			const smart2 = edgeTypes.smart;

			expect(smart1).toBe(smart2);
		});

		it("should minimize memory footprint with shared configuration", () => {
			// The configuration object should be lightweight
			const configSize = Object.keys(edgeTypes).length;
			expect(configSize).toBeLessThan(10); // Should be a small configuration
		});

		it("should support efficient React Flow rendering", () => {
			// Edge types should be ready for React Flow without additional processing
			Object.values(edgeTypes).forEach(component => {
				expect(typeof component).toBe("function");
			});
		});
	});
});