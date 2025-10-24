import { logger } from "./logger"
import type { NavigateOptions } from "@tanstack/react-router"

export interface NavigationConfig {
	entityType: string
	routePath: string
	logContext: string
}

/**
 * Shared navigation utilities to eliminate repetitive navigation patterns
 * across entity routes and other components.
 */
export class NavigationHelper {
	/**
	 * Clean malformed OpenAlex URLs and redirect to clean entity ID
	 */
	static async handleMalformedEntityUrl(
		entityId: string,
		config: NavigationConfig,
		navigate: (options: NavigateOptions) => void
	): Promise<void> {
		const { entityType, routePath, logContext } = config

		if (!entityId) return

		// Check if entityId contains a full OpenAlex URL
		if (entityId.includes("https://openalex.org/") || entityId.includes("http://openalex.org/")) {
			try {
				const url = new URL(entityId.startsWith("http") ? entityId : `https://openalex.org/${entityId}`)
				const pathParts = url.pathname.split("/").filter(Boolean)

				if (pathParts.length === 1) {
					const cleanId = pathParts[0]

					logger.debug(
						"routing",
						`Redirecting from malformed ${entityType} URL to clean ID`,
						{
							originalId: entityId,
							cleanId,
							entityType,
						},
						logContext
					)

					navigate({
						to: routePath,
						params: { [`${entityType}Id`]: cleanId },
						replace: true,
					})
				}
			} catch (error) {
				logger.error(
					"routing",
					`Failed to parse ${entityType} URL for redirect`,
					{ error, originalId: entityId },
					logContext
				)
			}
		}
	}

	/**
	 * Handle random entity navigation
	 */
	static async handleRandomEntityNavigation<
		T extends { id: string; display_name?: string; title?: string },
	>(
		entityType: string,
		routePath: string,
		logContext: string,
		randomApiCall: (count: number) => Promise<{ results?: T[] } | T[]>,
		navigate: (options: NavigateOptions) => void,
		setIsLoadingRandom: (loading: boolean) => void
	): Promise<void> {
		try {
			logger.debug("routing", `Fetching random ${entityType}`, undefined, logContext)

			const response = await randomApiCall(1)
			const randomEntity = Array.isArray(response) ? response[0] : response.results?.[0]

			if (randomEntity?.id) {
				const cleanId = randomEntity.id.replace("https://openalex.org/", "")

				logger.debug(
					"routing",
					`Redirecting to random ${entityType}`,
					{
						[`${entityType}Id`]: cleanId,
						title: randomEntity.display_name || randomEntity.title,
					},
					logContext
				)

				navigate({
					to: routePath,
					params: { [`${entityType}Id`]: cleanId },
					search: (prev) => prev,
					replace: true,
				})
			}
		} catch (error) {
			logger.error("routing", `Failed to fetch random ${entityType}`, { error }, logContext)
			setIsLoadingRandom(false)
		}
	}

	/**
	 * Create a navigation utility with preset configuration
	 */
	static createEntityNavigator(config: NavigationConfig) {
		return {
			handleMalformedUrl: (entityId: string, navigate: (options: NavigateOptions) => void) =>
				this.handleMalformedEntityUrl(entityId, config, navigate),

			handleRandomNavigation: <T extends { id: string; display_name?: string; title?: string }>(
				randomApiCall: (count: number) => Promise<{ results?: T[] } | T[]>,
				navigate: (options: NavigateOptions) => void,
				setIsLoadingRandom: (loading: boolean) => void
			) =>
				this.handleRandomEntityNavigation(
					config.entityType,
					config.routePath,
					config.logContext,
					randomApiCall,
					navigate,
					setIsLoadingRandom
				),
		}
	}

	/**
	 * Extract clean entity ID from various input formats
	 */
	static extractCleanEntityId(input: string): string {
		if (!input) return ""

		// If it's already a clean ID, return as-is
		if (!input.includes("openalex.org")) {
			return input.split("?")[0] // Remove query parameters
		}

		// If it's a full URL, extract the ID
		try {
			const url = new URL(input.startsWith("http") ? input : `https://openalex.org/${input}`)
			const pathParts = url.pathname.split("/").filter(Boolean)
			return pathParts[pathParts.length - 1] || ""
		} catch {
			// Fallback: try to extract from string
			const match = input.match(/(?:https?:\/\/openalex\.org\/)?([A-Z]\d+)/)
			return match?.[1] || input.split("?")[0]
		}
	}

	/**
	 * Build entity URL with proper format
	 */
	static buildEntityUrl(entityType: string, entityId: string, query?: Record<string, unknown>): string {
		const baseUrl = `/${entityType}s/${entityId}`
		if (!query || Object.keys(query).length === 0) {
			return baseUrl
		}

		const searchParams = new URLSearchParams()
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				searchParams.append(key, String(value))
			}
		})

		return `${baseUrl}?${searchParams.toString()}`
	}
}
