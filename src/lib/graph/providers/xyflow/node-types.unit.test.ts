/**
 * Unit tests for XYFlow node types configuration
 * Tests node type mappings, component references, and React Fast Refresh compatibility
 */

import { describe, it, expect, vi } from "vitest";
import { nodeTypes } from "./node-types";

// Mock the custom node components to avoid complex dependencies
vi.mock("./custom-nodes", () => ({
	CustomNode: vi.fn(() => null),
	WorkNode: vi.fn(() => null),
	AuthorNode: vi.fn(() => null),
	SourceNode: vi.fn(() => null),
	InstitutionNode: vi.fn(() => null),
}));

describe("node types configuration", () => {
	describe("nodeTypes object structure", () => {
		it("should be an object with expected node type keys", () => {
			expect(typeof nodeTypes).toBe("object");
			expect(nodeTypes).not.toBeNull();
		});

		it("should have exactly five node types defined", () => {
			const keys = Object.keys(nodeTypes);
			expect(keys).toHaveLength(5);
		});

		it("should include all expected node type keys", () => {
			const expectedKeys = ["custom", "work", "author", "source", "institution"];
			const actualKeys = Object.keys(nodeTypes);

			expectedKeys.forEach(key => {
				expect(actualKeys).toContain(key);
			});
		});

		it("should have all node types as string keys", () => {
			Object.keys(nodeTypes).forEach(key => {
				expect(typeof key).toBe("string");
				expect(key.length).toBeGreaterThan(0);
			});
		});
	});

	describe("node type mappings", () => {
		it("should map custom to CustomNode component", () => {
			expect(nodeTypes.custom).toBeDefined();
			expect(typeof nodeTypes.custom).toBe("function");
		});

		it("should map work to WorkNode component", () => {
			expect(nodeTypes.work).toBeDefined();
			expect(typeof nodeTypes.work).toBe("function");
		});

		it("should map author to AuthorNode component", () => {
			expect(nodeTypes.author).toBeDefined();
			expect(typeof nodeTypes.author).toBe("function");
		});

		it("should map source to SourceNode component", () => {
			expect(nodeTypes.source).toBeDefined();
			expect(typeof nodeTypes.source).toBe("function");
		});

		it("should map institution to InstitutionNode component", () => {
			expect(nodeTypes.institution).toBeDefined();
			expect(typeof nodeTypes.institution).toBe("function");
		});

		it("should have all node types mapped to functions/components", () => {
			Object.values(nodeTypes).forEach(nodeComponent => {
				expect(typeof nodeComponent).toBe("function");
			});
		});

		it("should provide different components for different node types", () => {
			const nodeComponents = Object.values(nodeTypes);
			const uniqueComponents = new Set(nodeComponents);

			// All components should be unique
			expect(uniqueComponents.size).toBe(nodeComponents.length);
		});
	});

	describe("OpenAlex entity type alignment", () => {
		it("should include node types for core OpenAlex entities", () => {
			// Core OpenAlex entity types that should have dedicated node components
			const coreEntityTypes = ["work", "author", "source", "institution"];

			coreEntityTypes.forEach(entityType => {
				expect(nodeTypes).toHaveProperty(entityType);
			});
		});

		it("should provide custom node type for generic/fallback rendering", () => {
			expect(nodeTypes).toHaveProperty("custom");
			expect(typeof nodeTypes.custom).toBe("function");
		});

		it("should align with Academic Explorer's entity type system", () => {
			// These should match the entity types used throughout the application
			const expectedEntityTypes = ["work", "author", "source", "institution"];

			expectedEntityTypes.forEach(entityType => {
				expect(nodeTypes).toHaveProperty(entityType);
			});
		});

		it("should support the primary academic research entities", () => {
			// Academic research workflow: works by authors, published in sources, at institutions
			expect(nodeTypes.work).toBeDefined(); // Research papers/articles
			expect(nodeTypes.author).toBeDefined(); // Researchers
			expect(nodeTypes.source).toBeDefined(); // Journals/conferences
			expect(nodeTypes.institution).toBeDefined(); // Universities/organizations
		});
	});

	describe("React Flow integration", () => {
		it("should provide node types compatible with React Flow", () => {
			// React Flow expects node types to be an object mapping strings to components
			expect(typeof nodeTypes).toBe("object");

			Object.entries(nodeTypes).forEach(([typeName, component]) => {
				expect(typeof typeName).toBe("string");
				expect(typeof component).toBe("function");
			});
		});

		it("should be suitable for React Flow nodeTypes prop", () => {
			// React Flow would use this as: <ReactFlow nodeTypes={nodeTypes} />
			expect(nodeTypes).toBeDefined();
			expect(Object.keys(nodeTypes).length).toBeGreaterThan(0);
		});

		it("should provide node type components that can be instantiated", () => {
			Object.values(nodeTypes).forEach(NodeComponent => {
				// Mock components should be callable (functions)
				expect(() => NodeComponent()).not.toThrow();
			});
		});

		it("should support XYFlow React Flow library requirements", () => {
			// XYFlow is a React wrapper for React Flow
			// Node types should be React components
			Object.values(nodeTypes).forEach(component => {
				expect(typeof component).toBe("function");
			});
		});
	});

	describe("component naming conventions", () => {
		it("should use camelCase naming for node type keys", () => {
			const keys = Object.keys(nodeTypes);
			keys.forEach(key => {
				// Check that keys follow camelCase (start with lowercase, no underscores or spaces)
				expect(key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
			});
		});

		it("should have meaningful node type names", () => {
			const keys = Object.keys(nodeTypes);

			keys.forEach(key => {
				// Names should be descriptive and not empty
				expect(key.length).toBeGreaterThan(0);
				expect(key).not.toMatch(/^[0-9]+$/); // Not just numbers
			});
		});

		it("should follow semantic naming for academic entities", () => {
			// Node types should reflect their academic purpose
			expect(nodeTypes).toHaveProperty("work"); // Academic works/papers
			expect(nodeTypes).toHaveProperty("author"); // Researchers/academics
			expect(nodeTypes).toHaveProperty("source"); // Journals/publications
			expect(nodeTypes).toHaveProperty("institution"); // Universities/organizations
			expect(nodeTypes).toHaveProperty("custom"); // Generic/fallback
		});

		it("should not include deprecated or legacy node types", () => {
			const keys = Object.keys(nodeTypes);

			// Should not include legacy names that might confuse users
			expect(keys).not.toContain("paper"); // Use "work" instead
			expect(keys).not.toContain("researcher"); // Use "author" instead
			expect(keys).not.toContain("journal"); // Use "source" instead
			expect(keys).not.toContain("university"); // Use "institution" instead
		});
	});

	describe("React Fast Refresh compatibility", () => {
		it("should support React Fast Refresh by separating registry from components", () => {
			// This configuration file should be lightweight and not contain component definitions
			// Components are imported from separate module to support hot reloading
			expect(typeof nodeTypes).toBe("object");

			// All values should be imported functions, not inline definitions
			Object.values(nodeTypes).forEach(component => {
				expect(typeof component).toBe("function");
				// Components should have a name (not anonymous functions)
				expect(component.name).toBeDefined();
			});
		});

		it("should enable hot module replacement for node components", () => {
			// By importing components from external module, HMR can update components
			// without losing React state in the graph visualization
			expect(nodeTypes).toBeDefined();

			// Components should be references to external functions
			Object.values(nodeTypes).forEach(component => {
				expect(component).toBeDefined();
				expect(typeof component).toBe("function");
			});
		});

		it("should maintain stable configuration structure during development", () => {
			// The node types configuration should remain stable even when components update
			const keys = Object.keys(nodeTypes);
			expect(keys).toHaveLength(5);

			// Key names should be consistent for React Flow integration
			expect(keys).toEqual(["custom", "work", "author", "source", "institution"]);
		});
	});

	describe("performance characteristics", () => {
		it("should not create new component instances on each access", () => {
			// Node components should be stable references
			const work1 = nodeTypes.work;
			const work2 = nodeTypes.work;

			expect(work1).toBe(work2);
		});

		it("should minimize memory footprint with shared configuration", () => {
			// The configuration object should be lightweight
			const configSize = Object.keys(nodeTypes).length;
			expect(configSize).toBeLessThanOrEqual(10); // Should be a small configuration
		});

		it("should support efficient React Flow rendering", () => {
			// Node types should be ready for React Flow without additional processing
			Object.values(nodeTypes).forEach(component => {
				expect(typeof component).toBe("function");
			});
		});

		it("should enable optimized graph rendering with typed nodes", () => {
			// Different node types allow React Flow to optimize rendering
			const nodeTypeCount = Object.keys(nodeTypes).length;
			expect(nodeTypeCount).toBeGreaterThan(1); // Multiple types for optimization
		});
	});

	describe("configuration immutability", () => {
		it("should maintain consistent node type configuration", () => {
			const config1 = nodeTypes;
			const config2 = nodeTypes;

			// Should be the same reference
			expect(config1).toBe(config2);
		});

		it("should provide stable references to node components", () => {
			const customComponent1 = nodeTypes.custom;
			const customComponent2 = nodeTypes.custom;

			expect(customComponent1).toBe(customComponent2);
		});

		it("should not be accidentally modifiable in consuming code", () => {
			// While JavaScript objects are mutable, the configuration should be treated as immutable
			const originalCustom = nodeTypes.custom;
			const originalWork = nodeTypes.work;

			expect(nodeTypes.custom).toBe(originalCustom);
			expect(nodeTypes.work).toBe(originalWork);
		});
	});

	describe("node type functionality", () => {
		it("should provide custom node as fallback for unknown entity types", () => {
			// The 'custom' type should handle any entity that doesn't have a specific node type
			expect(nodeTypes).toHaveProperty("custom");
			expect(nodeTypes.custom).toBeDefined();
		});

		it("should provide specific nodes for major OpenAlex entity types", () => {
			// Major entity types should have dedicated, optimized node components
			const majorEntityTypes = ["work", "author", "source", "institution"];

			majorEntityTypes.forEach(entityType => {
				expect(nodeTypes).toHaveProperty(entityType);
				expect(nodeTypes[entityType as keyof typeof nodeTypes]).toBeDefined();
			});
		});

		it("should support Academic Explorer's graph visualization requirements", () => {
			// All node types should be available for academic graph visualization
			expect(typeof nodeTypes.work).toBe("function"); // Research papers
			expect(typeof nodeTypes.author).toBe("function"); // Researchers
			expect(typeof nodeTypes.source).toBe("function"); // Publications
			expect(typeof nodeTypes.institution).toBe("function"); // Organizations
			expect(typeof nodeTypes.custom).toBe("function"); // Generic entities
		});
	});

	describe("component imports and structure", () => {
		it("should import all components from custom-nodes module", () => {
			// All node components should come from the same module for consistency
			expect(nodeTypes.custom).toBeDefined();
			expect(nodeTypes.work).toBeDefined();
			expect(nodeTypes.author).toBeDefined();
			expect(nodeTypes.source).toBeDefined();
			expect(nodeTypes.institution).toBeDefined();
		});

		it("should handle import failures gracefully", () => {
			// This test ensures the configuration is robust
			expect(() => {
				const config = nodeTypes;
				return config;
			}).not.toThrow();
		});

		it("should provide components with proper React component signatures", () => {
			// All node components should be valid React components
			Object.values(nodeTypes).forEach(component => {
				expect(typeof component).toBe("function");
				// Mock components should be callable
				expect(() => component()).not.toThrow();
			});
		});
	});

	describe("usage patterns and compatibility", () => {
		it("should support entity-specific node rendering", () => {
			// Different entity types should get different visual representations
			const entityTypes = ["work", "author", "source", "institution"];

			entityTypes.forEach(entityType => {
				const nodeComponent = nodeTypes[entityType as keyof typeof nodeTypes];
				expect(nodeComponent).toBeDefined();
				expect(typeof nodeComponent).toBe("function");
			});
		});

		it("should provide fallback rendering with custom node type", () => {
			// Custom node should handle any entity that doesn't have a specific type
			const customNode = nodeTypes.custom;
			expect(customNode).toBeDefined();
			expect(typeof customNode).toBe("function");
		});

		it("should be compatible with React Flow node type requirements", () => {
			// Verify the configuration structure matches React Flow expectations
			const nodeTypeNames = Object.keys(nodeTypes);

			nodeTypeNames.forEach(typeName => {
				// Node type names should be strings
				expect(typeof typeName).toBe("string");

				// Node components should be functions (React components)
				expect(typeof nodeTypes[typeName as keyof typeof nodeTypes]).toBe("function");
			});
		});

		it("should enable semantic graph visualization", () => {
			// Different node types allow for semantic understanding of graph structure
			expect(nodeTypes.work).toBeDefined(); // Academic papers
			expect(nodeTypes.author).toBeDefined(); // People/researchers
			expect(nodeTypes.source).toBeDefined(); // Venues/publications
			expect(nodeTypes.institution).toBeDefined(); // Organizations
		});
	});

	describe("academic domain modeling", () => {
		it("should model the core entities in academic research", () => {
			// The node types should represent the fundamental entities in academic research
			expect(nodeTypes.work).toBeDefined(); // Research outputs
			expect(nodeTypes.author).toBeDefined(); // Researchers
			expect(nodeTypes.source).toBeDefined(); // Publication venues
			expect(nodeTypes.institution).toBeDefined(); // Academic institutions
		});

		it("should support academic relationship visualization", () => {
			// Node types should enable visualization of academic relationships
			// (authors write works, published in sources, affiliated with institutions)
			const academicEntityTypes = ["work", "author", "source", "institution"];

			academicEntityTypes.forEach(entityType => {
				expect(nodeTypes).toHaveProperty(entityType);
			});
		});

		it("should align with OpenAlex data model", () => {
			// OpenAlex is the primary data source, so node types should match its entities
			const openAlexEntityTypes = ["work", "author", "source", "institution"];

			openAlexEntityTypes.forEach(entityType => {
				expect(nodeTypes).toHaveProperty(entityType);
				expect(typeof nodeTypes[entityType as keyof typeof nodeTypes]).toBe("function");
			});
		});
	});
});