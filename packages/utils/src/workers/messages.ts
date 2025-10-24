import { z } from "zod"

/**
 * Worker message schemas and types for graph operations
 * Provides runtime validation and type safety for worker communication
 */

// Base schemas for force simulation data structures
export const forceSimulationNodeSchema = z.object({
	id: z.string(),
	entityType: z
		.enum([
			"works",
			"authors",
			"sources",
			"institutions",
			"topics",
			"concepts",
			"publishers",
			"funders",
			"keywords",
		])
		.optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	fx: z.number().optional(),
	fy: z.number().optional(),
})

export const forceSimulationLinkSchema = z.object({
	id: z.string(),
	source: z.string(),
	target: z.string(),
})

export const forceSimulationConfigSchema = z.object({
	linkDistance: z.number().optional(),
	linkStrength: z.number().optional(),
	chargeStrength: z.number().optional(),
	centerStrength: z.number().optional(),
	collisionRadius: z.number().optional(),
	collisionStrength: z.number().optional(),
	velocityDecay: z.number().optional(),
	alphaDecay: z.number().optional(),
	maxIterations: z.number().optional(),
	seed: z.number().optional(),
	targetFPS: z.number().optional(),
	sendEveryNTicks: z.number().optional(),
	enableOptimizations: z.boolean().optional(),
	batchUpdates: z.boolean().optional(),
})

// Request message schemas
export const forceSimulationStartMessageSchema = z.object({
	type: z.literal("FORCE_SIMULATION_START"),
	nodes: z.array(forceSimulationNodeSchema),
	links: z.array(forceSimulationLinkSchema),
	config: forceSimulationConfigSchema.optional(),
	pinnedNodes: z.array(z.string()).optional(),
})

export const forceSimulationControlMessageSchema = z.object({
	type: z.enum([
		"FORCE_SIMULATION_STOP",
		"FORCE_SIMULATION_PAUSE",
		"FORCE_SIMULATION_RESUME",
		"FORCE_SIMULATION_UPDATE_PARAMETERS",
		"FORCE_SIMULATION_REHEAT",
		"FORCE_SIMULATION_UPDATE_LINKS",
		"FORCE_SIMULATION_UPDATE_NODES",
	]),
	config: forceSimulationConfigSchema.partial().optional(),
})

export const forceSimulationReheatMessageSchema = z.object({
	type: z.literal("FORCE_SIMULATION_REHEAT"),
	nodes: z.array(forceSimulationNodeSchema),
	links: z.array(forceSimulationLinkSchema),
	config: forceSimulationConfigSchema.optional(),
	pinnedNodes: z.array(z.string()).optional(),
	alpha: z.number().optional().default(1.0),
})

export const forceSimulationUpdateLinksMessageSchema = z.object({
	type: z.literal("FORCE_SIMULATION_UPDATE_LINKS"),
	links: z.array(forceSimulationLinkSchema),
	alpha: z.number().optional().default(1.0),
})

export const forceSimulationUpdateNodesMessageSchema = z.object({
	type: z.literal("FORCE_SIMULATION_UPDATE_NODES"),
	nodes: z.array(forceSimulationNodeSchema),
	pinnedNodes: z.array(z.string()).optional(),
	alpha: z.number().optional().default(1.0),
})

// Task wrapper schema for worker pool
export const executeTaskMessageSchema = z.object({
	type: z.literal("EXECUTE_TASK"),
	taskId: z.string(),
	payload: z.unknown(),
})

// Union type for all force simulation control messages
export const anyForceSimulationControlMessageSchema = z.union([
	forceSimulationControlMessageSchema,
	forceSimulationReheatMessageSchema,
	forceSimulationUpdateLinksMessageSchema,
	forceSimulationUpdateNodesMessageSchema,
])

// Response message schemas
export const workerProgressResponseSchema = z.object({
	type: z.literal("PROGRESS"),
	taskId: z.string().optional(),
	payload: z.object({
		type: z.string(),
		workerId: z.string(),
		workerType: z.string(),
		messageType: z.string(),
		positions: z
			.array(
				z.object({
					id: z.string(),
					x: z.number(),
					y: z.number(),
					fx: z.number().nullable(),
					fy: z.number().nullable(),
				})
			)
			.optional(),
		alpha: z.number().optional(),
		iteration: z.number().optional(),
		progress: z.number(),
		fps: z.number().optional(),
		nodeCount: z.number(),
		linkCount: z.number(),
		timestamp: z.number(),
	}),
})

export const workerSuccessResponseSchema = z.object({
	type: z.literal("SUCCESS"),
	taskId: z.string().optional(),
	payload: z.union([
		z.object({
			type: z.literal("FORCE_SIMULATION_CONTROL_ACK"),
			action: z.string(),
			status: z.literal("ok"),
			timestamp: z.number(),
			nodeCount: z.number().optional(),
			linkCount: z.number().optional(),
			alpha: z.number().optional(),
			pinnedCount: z.number().optional(),
		}),
		z.object({
			type: z.literal("FORCE_SIMULATION_COMPLETE"),
			workerId: z.string(),
			workerType: z.string(),
			positions: z.array(
				z.object({
					id: z.string(),
					x: z.number(),
					y: z.number(),
					fx: z.number().nullable(),
					fy: z.number().nullable(),
				})
			),
			totalIterations: z.number(),
			finalAlpha: z.number(),
			reason: z.string(),
			timestamp: z.number(),
		}),
	]),
})

export const workerErrorResponseSchema = z.object({
	type: z.literal("ERROR"),
	taskId: z.string().optional(),
	payload: z.string(),
})

export const workerReadyResponseSchema = z.object({
	type: z.literal("WORKER_READY"),
	payload: z.object({
		workerId: z.string(),
		workerType: z.string(),
		timestamp: z.number(),
	}),
})

// Union type for all request messages
export const graphWorkerRequestSchema = z.union([
	forceSimulationStartMessageSchema,
	anyForceSimulationControlMessageSchema,
	executeTaskMessageSchema,
])

// Union type for all response messages
export const graphWorkerResponseSchema = z.union([
	workerProgressResponseSchema,
	workerSuccessResponseSchema,
	workerErrorResponseSchema,
	workerReadyResponseSchema,
])

// Type exports
export type ForceSimulationNode = z.infer<typeof forceSimulationNodeSchema>
export type ForceSimulationLink = z.infer<typeof forceSimulationLinkSchema>
export type ForceSimulationConfig = z.infer<typeof forceSimulationConfigSchema>

export type ForceSimulationStartMessage = z.infer<typeof forceSimulationStartMessageSchema>
export type ForceSimulationControlMessage = z.infer<typeof forceSimulationControlMessageSchema>
export type ForceSimulationReheatMessage = z.infer<typeof forceSimulationReheatMessageSchema>
export type ForceSimulationUpdateLinksMessage = z.infer<
	typeof forceSimulationUpdateLinksMessageSchema
>
export type ForceSimulationUpdateNodesMessage = z.infer<
	typeof forceSimulationUpdateNodesMessageSchema
>
export type ExecuteTaskMessage = z.infer<typeof executeTaskMessageSchema>
export type AnyForceSimulationControlMessage = z.infer<
	typeof anyForceSimulationControlMessageSchema
>

export type WorkerProgressResponse = z.infer<typeof workerProgressResponseSchema>
export type WorkerSuccessResponse = z.infer<typeof workerSuccessResponseSchema>
export type WorkerErrorResponse = z.infer<typeof workerErrorResponseSchema>
export type WorkerReadyResponse = z.infer<typeof workerReadyResponseSchema>

// Main exported types
export type GraphWorkerRequest = z.infer<typeof graphWorkerRequestSchema>
export type GraphWorkerResponse = z.infer<typeof graphWorkerResponseSchema>

// Runtime validators
export const validateGraphWorkerRequest = (data: unknown): data is GraphWorkerRequest => {
	return graphWorkerRequestSchema.safeParse(data).success
}

export const validateGraphWorkerResponse = (data: unknown): data is GraphWorkerResponse => {
	return graphWorkerResponseSchema.safeParse(data).success
}

// Specific message validators
export const isForceSimulationStartMessage = (
	data: unknown
): data is ForceSimulationStartMessage => {
	return forceSimulationStartMessageSchema.safeParse(data).success
}

export const isForceSimulationControlMessage = (
	data: unknown
): data is AnyForceSimulationControlMessage => {
	return anyForceSimulationControlMessageSchema.safeParse(data).success
}

export const isExecuteTaskMessage = (data: unknown): data is ExecuteTaskMessage => {
	return executeTaskMessageSchema.safeParse(data).success
}

export const isWorkerProgressResponse = (data: unknown): data is WorkerProgressResponse => {
	return workerProgressResponseSchema.safeParse(data).success
}

export const isWorkerSuccessResponse = (data: unknown): data is WorkerSuccessResponse => {
	return workerSuccessResponseSchema.safeParse(data).success
}

export const isWorkerErrorResponse = (data: unknown): data is WorkerErrorResponse => {
	return workerErrorResponseSchema.safeParse(data).success
}

export const isWorkerReadyResponse = (data: unknown): data is WorkerReadyResponse => {
	return workerReadyResponseSchema.safeParse(data).success
}
