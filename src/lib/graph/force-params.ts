/**
 * Force simulation parameter constants
 */

// Default force parameters (matching current hardcoded values)
export const DEFAULT_FORCE_PARAMS = {
	linkDistance: 100,
	linkStrength: 0.01,
	chargeStrength: -1000,
	centerStrength: 0.01,
	collisionRadius: 120,
	collisionStrength: 1.0,
	velocityDecay: 0.1,
	alphaDecay: 0.03,
} as const;

export type ForceParameters = typeof DEFAULT_FORCE_PARAMS;

// Force parameter metadata for UI controls
export const FORCE_PARAM_CONFIG = {
	linkDistance: {
		label: "Link Distance",
		min: 10,
		max: 300,
		step: 10,
		description: "Target distance between connected nodes",
	},
	linkStrength: {
		label: "Link Strength",
		min: 0,
		max: 1,
		step: 0.01,
		description: "Strength of the force connecting nodes",
	},
	chargeStrength: {
		label: "Charge Strength",
		min: -3000,
		max: 0,
		step: 50,
		description: "Repulsive force between nodes (negative values)",
	},
	centerStrength: {
		label: "Center Strength",
		min: 0,
		max: 0.1,
		step: 0.001,
		description: "Force pulling nodes toward the center",
	},
	collisionRadius: {
		label: "Collision Radius",
		min: 10,
		max: 200,
		step: 5,
		description: "Minimum distance between node centers",
	},
	collisionStrength: {
		label: "Collision Strength",
		min: 0,
		max: 2,
		step: 0.1,
		description: "Strength of collision detection",
	},
	velocityDecay: {
		label: "Velocity Decay",
		min: 0,
		max: 1,
		step: 0.01,
		description: "Friction coefficient (higher = more friction)",
	},
	alphaDecay: {
		label: "Alpha Decay",
		min: 0.001,
		max: 0.1,
		step: 0.001,
		description: "Rate at which simulation cools down",
	},
} as const;