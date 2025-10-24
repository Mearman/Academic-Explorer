import { logger as _logger } from "../logger"

/**
 * Base activity tracking interface
 */
export interface BaseActivity {
	id: string
	timestamp: number
	type: string
	category: string
	description: string
}

/**
 * Progress tracking interface
 */
export interface ProgressTracking {
	completed: number
	total: number
	stage: string
	percentage?: number
}

/**
 * Status tracking interface
 */
export interface StatusTracking {
	status: "pending" | "active" | "completed" | "error" | "cancelled"
	startTime: number
	endTime?: number
	duration?: number
	error?: string
}

/**
 * Activity store factory for creating standardized activity tracking stores
 */

/**
 * Progress tracking utilities
 */
export function createProgressUpdater(
	updateItem: (id: string, updates: Record<string, unknown>) => void,
	completeItem: (id: string, updates?: Record<string, unknown>) => void
) {
	return {
		updateProgress: (id: string, progress: ProgressTracking) => {
			const percentage =
				progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

			updateItem(id, {
				progress: {
					...progress,
					percentage,
				},
			})
		},

		completeProgress: (id: string, finalUpdates?: Record<string, unknown>) => {
			completeItem(id, {
				progress: {
					completed: 100,
					total: 100,
					stage: "Completed",
					percentage: 100,
				},
				...finalUpdates,
			})
		},
	}
}
