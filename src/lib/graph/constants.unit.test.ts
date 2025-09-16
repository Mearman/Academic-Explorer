/**
 * Unit tests for graph constants and utilities
 * Tests animation constants, fitView configurations, and helper functions
 */

import { describe, it, expect } from "vitest";
import {
	GRAPH_ANIMATION,
	createFitViewOptions,
	FIT_VIEW_PRESETS
} from "./constants";

describe("GRAPH_ANIMATION constants", () => {
	describe("FIT_VIEW_DURATION", () => {
		it("should be set to 800 milliseconds for standard duration", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_DURATION).toBe(800);
		});

		it("should be a positive number", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_DURATION).toBeGreaterThan(0);
		});

		it("should be reasonable duration for UI animations (under 2 seconds)", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_DURATION).toBeLessThan(2000);
		});
	});

	describe("FIT_VIEW_PADDING", () => {
		it("should have DEFAULT padding of 0.1 (10% of viewport)", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT).toBe(0.1);
		});

		it("should have NEIGHBORHOOD padding of 0.3 (30% of viewport)", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD).toBe(0.3);
		});

		it("should have DEFAULT padding less than NEIGHBORHOOD padding", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT)
				.toBeLessThan(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD);
		});

		it("should have padding values in valid range (0-1)", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT).toBeGreaterThanOrEqual(0);
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT).toBeLessThanOrEqual(1);
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD).toBeGreaterThanOrEqual(0);
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD).toBeLessThanOrEqual(1);
		});

		it("should have reasonable padding values for UI layout", () => {
			// Default should be relatively small
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT).toBeLessThan(0.2);
			// Neighborhood should provide more breathing room but not be excessive
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD).toBeLessThan(0.5);
		});
	});

	describe("FIT_VIEW_CONFLICT_DELAY", () => {
		it("should be 900 milliseconds", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY).toBe(900);
		});

		it("should be greater than FIT_VIEW_DURATION to prevent conflicts", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY)
				.toBeGreaterThan(GRAPH_ANIMATION.FIT_VIEW_DURATION);
		});

		it("should be a reasonable delay (not too short or too long)", () => {
			expect(GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY).toBeGreaterThan(500);
			expect(GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY).toBeLessThan(2000);
		});

		it("should provide sufficient buffer after animation completion", () => {
			const buffer = GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY - GRAPH_ANIMATION.FIT_VIEW_DURATION;
			expect(buffer).toBeGreaterThan(50); // At least 50ms buffer
		});
	});

	describe("constant immutability", () => {
		it("should be defined as const assertion for TypeScript immutability", () => {
			// TypeScript const assertion provides compile-time immutability
			// Runtime immutability is not enforced with Object.freeze()
			expect(GRAPH_ANIMATION).toBeDefined();
			expect(GRAPH_ANIMATION.FIT_VIEW_PADDING).toBeDefined();
		});

		it("should maintain reference stability", () => {
			// Constants should maintain the same reference across accesses
			const ref1 = GRAPH_ANIMATION;
			const ref2 = GRAPH_ANIMATION;
			expect(ref1).toBe(ref2);

			const paddingRef1 = GRAPH_ANIMATION.FIT_VIEW_PADDING;
			const paddingRef2 = GRAPH_ANIMATION.FIT_VIEW_PADDING;
			expect(paddingRef1).toBe(paddingRef2);
		});
	});
});

describe("createFitViewOptions function", () => {
	describe("default behavior", () => {
		it("should create options with default values when no parameters provided", () => {
			const options = createFitViewOptions();

			expect(options).toEqual({
				padding: GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT,
				duration: GRAPH_ANIMATION.FIT_VIEW_DURATION,
			});
		});

		it("should use default padding when only duration provided", () => {
			const customDuration = 1000;
			const options = createFitViewOptions(undefined, customDuration);

			expect(options.padding).toBe(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT);
			expect(options.duration).toBe(customDuration);
		});

		it("should use default duration when only padding provided", () => {
			const customPadding = 0.25;
			const options = createFitViewOptions(customPadding);

			expect(options.padding).toBe(customPadding);
			expect(options.duration).toBe(GRAPH_ANIMATION.FIT_VIEW_DURATION);
		});
	});

	describe("custom values", () => {
		it("should accept custom padding and duration", () => {
			const customPadding = 0.15;
			const customDuration = 1200;
			const options = createFitViewOptions(customPadding, customDuration);

			expect(options.padding).toBe(customPadding);
			expect(options.duration).toBe(customDuration);
		});

		it("should handle zero padding", () => {
			const options = createFitViewOptions(0);

			expect(options.padding).toBe(0);
			expect(options.duration).toBe(GRAPH_ANIMATION.FIT_VIEW_DURATION);
		});

		it("should handle zero duration", () => {
			const options = createFitViewOptions(undefined, 0);

			expect(options.padding).toBe(GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT);
			expect(options.duration).toBe(0);
		});

		it("should handle maximum padding (1.0)", () => {
			const options = createFitViewOptions(1.0);

			expect(options.padding).toBe(1.0);
		});
	});

	describe("return value structure", () => {
		it("should return object with exactly padding and duration properties", () => {
			const options = createFitViewOptions();
			const keys = Object.keys(options);

			expect(keys).toHaveLength(2);
			expect(keys).toContain("padding");
			expect(keys).toContain("duration");
		});

		it("should return new object instance each time", () => {
			const options1 = createFitViewOptions();
			const options2 = createFitViewOptions();

			expect(options1).not.toBe(options2);
			expect(options1).toEqual(options2);
		});

		it("should have numeric values for both properties", () => {
			const options = createFitViewOptions();

			expect(typeof options.padding).toBe("number");
			expect(typeof options.duration).toBe("number");
		});
	});

	describe("edge cases", () => {
		it("should handle negative padding gracefully", () => {
			const options = createFitViewOptions(-0.1);

			expect(options.padding).toBe(-0.1);
		});

		it("should handle negative duration gracefully", () => {
			const options = createFitViewOptions(undefined, -100);

			expect(options.duration).toBe(-100);
		});

		it("should handle very large values", () => {
			const largePadding = 999.9;
			const largeDuration = 60000;
			const options = createFitViewOptions(largePadding, largeDuration);

			expect(options.padding).toBe(largePadding);
			expect(options.duration).toBe(largeDuration);
		});

		it("should handle decimal precision", () => {
			const precisionPadding = 0.123456789;
			const options = createFitViewOptions(precisionPadding);

			expect(options.padding).toBe(precisionPadding);
		});
	});
});

describe("FIT_VIEW_PRESETS", () => {
	describe("DEFAULT preset", () => {
		it("should use default animation constants", () => {
			expect(FIT_VIEW_PRESETS.DEFAULT).toEqual({
				padding: GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT,
				duration: GRAPH_ANIMATION.FIT_VIEW_DURATION,
			});
		});

		it("should be equivalent to calling createFitViewOptions with no parameters", () => {
			const manualOptions = createFitViewOptions();

			expect(FIT_VIEW_PRESETS.DEFAULT).toEqual(manualOptions);
		});
	});

	describe("NEIGHBORHOOD preset", () => {
		it("should use neighborhood padding with default duration", () => {
			expect(FIT_VIEW_PRESETS.NEIGHBORHOOD).toEqual({
				padding: GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD,
				duration: GRAPH_ANIMATION.FIT_VIEW_DURATION,
			});
		});

		it("should be equivalent to calling createFitViewOptions with neighborhood padding", () => {
			const manualOptions = createFitViewOptions(GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD);

			expect(FIT_VIEW_PRESETS.NEIGHBORHOOD).toEqual(manualOptions);
		});

		it("should have more padding than DEFAULT preset", () => {
			expect(FIT_VIEW_PRESETS.NEIGHBORHOOD.padding)
				.toBeGreaterThan(FIT_VIEW_PRESETS.DEFAULT.padding);
		});

		it("should have same duration as DEFAULT preset", () => {
			expect(FIT_VIEW_PRESETS.NEIGHBORHOOD.duration)
				.toBe(FIT_VIEW_PRESETS.DEFAULT.duration);
		});
	});

	describe("preset immutability", () => {
		it("should be defined as const assertion for TypeScript immutability", () => {
			// TypeScript const assertion provides compile-time immutability
			expect(FIT_VIEW_PRESETS).toBeDefined();
			expect(FIT_VIEW_PRESETS.DEFAULT).toBeDefined();
			expect(FIT_VIEW_PRESETS.NEIGHBORHOOD).toBeDefined();
		});

		it("should have individual presets that allow ReactFlow usage", () => {
			// ReactFlow can use these objects without modification conflicts
			// since they are plain objects with numeric properties
			expect(typeof FIT_VIEW_PRESETS.DEFAULT.padding).toBe("number");
			expect(typeof FIT_VIEW_PRESETS.DEFAULT.duration).toBe("number");
			expect(typeof FIT_VIEW_PRESETS.NEIGHBORHOOD.padding).toBe("number");
			expect(typeof FIT_VIEW_PRESETS.NEIGHBORHOOD.duration).toBe("number");
		});
	});

	describe("preset consistency", () => {
		it("should ensure all presets have same structure", () => {
			const presets = Object.values(FIT_VIEW_PRESETS);

			presets.forEach(preset => {
				expect(preset).toHaveProperty("padding");
				expect(preset).toHaveProperty("duration");
				expect(typeof preset.padding).toBe("number");
				expect(typeof preset.duration).toBe("number");
			});
		});

		it("should have exactly two presets defined", () => {
			const presetKeys = Object.keys(FIT_VIEW_PRESETS);

			expect(presetKeys).toHaveLength(2);
			expect(presetKeys).toContain("DEFAULT");
			expect(presetKeys).toContain("NEIGHBORHOOD");
		});
	});
});

describe("integration and usage patterns", () => {
	describe("animation timing consistency", () => {
		it("should ensure conflict delay accounts for all animation timing", () => {
			const totalAnimationTime = GRAPH_ANIMATION.FIT_VIEW_DURATION;
			const safetyBuffer = GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY - totalAnimationTime;

			// Should have at least 50ms buffer for animation completion
			expect(safetyBuffer).toBeGreaterThanOrEqual(50);
		});

		it("should provide reasonable timing for smooth user experience", () => {
			// Animation should not be too fast (jarring) or too slow (sluggish)
			expect(GRAPH_ANIMATION.FIT_VIEW_DURATION).toBeGreaterThanOrEqual(300);
			expect(GRAPH_ANIMATION.FIT_VIEW_DURATION).toBeLessThanOrEqual(1500);
		});
	});

	describe("padding value relationships", () => {
		it("should maintain logical progression of padding values", () => {
			const defaultPadding = GRAPH_ANIMATION.FIT_VIEW_PADDING.DEFAULT;
			const neighborhoodPadding = GRAPH_ANIMATION.FIT_VIEW_PADDING.NEIGHBORHOOD;

			// Should progress logically: default < neighborhood
			expect(defaultPadding).toBeLessThan(neighborhoodPadding);

			// Difference should be meaningful but not excessive
			const difference = neighborhoodPadding - defaultPadding;
			expect(difference).toBeGreaterThan(0.1); // At least 10% difference
			expect(difference).toBeLessThan(0.5); // Not more than 50% difference
		});
	});

	describe("ReactFlow compatibility", () => {
		it("should create options compatible with ReactFlow fitView method", () => {
			const options = createFitViewOptions();

			// ReactFlow expects numeric padding and duration
			expect(typeof options.padding).toBe("number");
			expect(typeof options.duration).toBe("number");

			// Values should be in expected ranges for ReactFlow
			expect(options.padding).toBeGreaterThanOrEqual(0);
			expect(options.duration).toBeGreaterThanOrEqual(0);
		});

		it("should provide presets that work with ReactFlow out of the box", () => {
			const presets = [FIT_VIEW_PRESETS.DEFAULT, FIT_VIEW_PRESETS.NEIGHBORHOOD];

			presets.forEach(preset => {
				expect(preset).toHaveProperty("padding");
				expect(preset).toHaveProperty("duration");
				expect(preset.padding).toBeGreaterThanOrEqual(0);
				expect(preset.duration).toBeGreaterThanOrEqual(0);
			});
		});
	});
});