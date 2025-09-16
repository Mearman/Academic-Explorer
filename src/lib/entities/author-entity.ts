/**
 * Author entity implementation
 * Handles author-specific operations like expanding works
 */

import { AbstractEntity, type EntityContext, type ExpansionOptions, type ExpansionResult } from "./abstract-entity";
import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import type { Author, Work } from "@/lib/openalex/types";
import type { ExternalIdentifier, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType as RT } from "@/lib/graph/types";
import { logger } from "@/lib/logger";
import { ExpansionQueryBuilder } from "@/services/expansion-query-builder";

export class AuthorEntity extends AbstractEntity<Author> {
	constructor(client: RateLimitedOpenAlexClient, entityData?: Author) {
		super(client, "authors", entityData);
	}

	/**
   * Get minimal fields for author display in graph
   */
	protected getMinimalFields(): string[] {
		return ["id", "display_name", "orcid"];
	}

	/**
   * Get metadata fields for rich author display
   */
	protected getMetadataFields(): string[] {
		return [
			"id",
			"display_name",
			"orcid",
			"works_count",
			"cited_by_count",
			"summary_stats",
			"affiliations",
			"last_known_institutions"
		];
	}

	/**
   * Get fields that contain IDs of related entities for expansion
   */
	protected getExpansionFields(): string[] {
		return [
			"id",
			"display_name",
			"affiliations",          // Contains institution IDs
			"last_known_institution", // Contains institution ID
			"topics",                // Contains topic IDs (author's research areas)
			"concepts"               // Contains concept IDs (research concepts)
		];
	}

	/**
   * Check if author entity is dehydrated (missing key fields)
   */
	protected isDehydrated(_author: Author): boolean {
		// Author entities are never considered dehydrated as all fields are always present
		return false;
	}

	/**
   * Expand an author to show recent works
   */
	async expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult> {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const { limit = 10, expansionSettings } = options;

		logger.info("graph", "AuthorEntity.expand called", {
			contextEntityId: context.entityId,
			limit,
			hasExpansionSettings: Boolean(expansionSettings),
			options
		}, "AuthorEntity");

		try {
			// First, fetch the author entity to get affiliation data for institution nodes
			const author = await this.client.getAuthor(context.entityId, {
				select: ["id", "display_name", "affiliations"]
			});

			// Create minimal institution nodes from affiliations
			if (author.affiliations.length > 0) {
				author.affiliations.slice(0, 3).forEach((affiliation, index) => {
					const institutionNode: GraphNode = {
						id: affiliation.institution.id,
						type: "institutions" as const,
						label: affiliation.institution.display_name,
						entityId: affiliation.institution.id,
						position: { x: (index - 1) * 200, y: 150 },
						externalIds: affiliation.institution.ror ? [
							{
								type: "ror" as const,
								value: affiliation.institution.ror,
								url: `https://ror.org/${affiliation.institution.ror}`,
							}
						] : [],
						metadata: {
							hydrationLevel: "minimal" as const,
							isLoading: false
						}
					};
					nodes.push(institutionNode);

					// Add affiliation edge
					edges.push(this.createEdge(
						context.entityId,
						affiliation.institution.id,
						RT.AFFILIATED,
						1.0,
						"affiliated with"
					));
				});
			}

			// Get expansion settings, with fallback to defaults
			const effectiveLimit = expansionSettings?.enabled ? expansionSettings.limit : limit;

			// Build query parameters from expansion settings if available
			let queryParams: { filter?: string; sort?: string; select?: string[] } = {};
			if (expansionSettings?.enabled) {
				const builtParams = ExpansionQueryBuilder.buildQueryParams(expansionSettings);
				queryParams = {
					filter: builtParams.filter,
					sort: builtParams.sort,
					select: builtParams.select
				};
				logger.debug("graph", "Using expansion settings for author expansion", {
					settings: expansionSettings,
					queryParams
				}, "AuthorEntity");
			}

			// Merge base filter with expansion settings filters if available
			const baseFilter = `authorships.author.id:${context.entityId}`;
			const finalFilter = queryParams.filter
				? ExpansionQueryBuilder.mergeFilters(baseFilter, expansionSettings?.filters || [])
				: baseFilter;

			// Fetch all works with pagination if no limit specified, or fetch up to limit
			const shouldFetchAll = !effectiveLimit || effectiveLimit <= 0 || effectiveLimit >= 10000;
			let allWorks: Work[] = [];
			let page = 1;
			let totalFetched = 0;

			logger.info("graph", "Starting works fetch", {
				shouldFetchAll,
				effectiveLimit,
				entityId: context.entityId
			}, "AuthorEntity");

			do {
				const worksResponse = await this.client.getWorks({
					filter: finalFilter,
					per_page: 200, // Always use maximum per page
					page: page,
					sort: queryParams.sort,
					select: queryParams.select
				});

				if (worksResponse.results.length === 0) {
					break; // No more results
				}

				allWorks.push(...worksResponse.results);
				totalFetched += worksResponse.results.length;

				logger.debug("graph", "Fetched works page", {
					page,
					pageResults: worksResponse.results.length,
					totalFetched,
					totalAvailable: worksResponse.meta.count,
					entityId: context.entityId
				}, "AuthorEntity");

				// Check if we have enough results or if this was the last page
				if (!shouldFetchAll && totalFetched >= effectiveLimit) {
					allWorks = allWorks.slice(0, effectiveLimit); // Trim to exact limit
					break;
				}

				if (worksResponse.results.length < 200) {
					// Last page (partial page means no more results)
					break;
				}

				page++;
			} while (shouldFetchAll || totalFetched < effectiveLimit);

			logger.info("graph", "Completed works fetch", {
				totalFetched: allWorks.length,
				pagesProcessed: page,
				entityId: context.entityId
			}, "AuthorEntity");

			// Process each work manually since we can't use transformToGraphNode with different entity types
			allWorks.forEach((work: Work) => {
				// Create work node manually with proper metadata
				const workNode: GraphNode = {
					id: work.id,
					type: "works" as const,
					label: work.display_name || "Untitled Work",
					entityId: work.id,
					position: this.generateRandomPosition(),
					externalIds: work.doi ? [{
						type: "doi" as const,
						value: work.doi,
						url: `https://doi.org/${work.doi}`,
					}] : [],
					metadata: {
						year: work.publication_year,
						citationCount: work.cited_by_count,
						openAccess: work.open_access.is_oa,
					},
				};
				nodes.push(workNode);

				// Add authorship edge
				edges.push(this.createEdge(
					context.entityId,
					work.id,
					RT.AUTHORED,
					1.0,
					"authored"
				));
			});

		} catch (error) {
			logger.error("graph", "Error in AuthorEntity.expand", {
				error: error instanceof Error ? error.message : String(error),
				entityId: context.entityId
			}, "AuthorEntity");

			// Call the parent class error handler
			this.handleError(error, "expand", context);

			// Return empty result on error
			return { nodes: [], edges: [] };
		}

		logger.info("graph", "AuthorEntity.expand completed", {
			nodesAdded: nodes.length,
			edgesAdded: edges.length,
			contextEntityId: context.entityId
		}, "AuthorEntity");

		return { nodes, edges };
	}

	/**
   * Extract external identifiers for authors (ORCID, etc.)
   */
	protected extractExternalIds(author: Author): ExternalIdentifier[] {
		const externalIds: ExternalIdentifier[] = [];

		if (author.orcid) {
			externalIds.push({
				type: "orcid",
				value: author.orcid,
				url: author.orcid.startsWith("http") ? author.orcid : `https://orcid.org/${author.orcid}`,
			});
		}

		return externalIds;
	}

	/**
   * Extract metadata specific to authors
   */
	protected extractMetadata(author: Author): Record<string, unknown> {
		return {
			worksCount: author.works_count,
			citationCount: author.cited_by_count,
			affiliations: author.affiliations.map(a => a.institution.display_name),
			lastKnownInstitutions: author.last_known_institutions?.map(i => i.display_name) || [],
		};
	}

	/**
   * Get author-specific search filters
   */
	public getSearchFilters(): Record<string, unknown> {
		return {
			type: "authors",
			sort: "works_count:desc",
			per_page: 25,
		};
	}

	/**
   * Get author summary including institution and metrics
   */
	public getSummary(author: Author): string {
		const name = this.getDisplayName(author);
		const institution = author.last_known_institutions?.[0]?.display_name;
		const works = author.works_count ? ` (${String(author.works_count)} works)` : "";
		const institutionText = institution ? ` - ${institution}` : "";

		return `${name}${institutionText}${works}`;
	}

	/**
   * Fetch author data with minimal fields needed for outbound edge extraction
   */
	async fetchForOutboundEdges(entityId: string): Promise<Author> {
		return await this.client.getAuthor(entityId, {
			select: [
				"id",
				"display_name",
				"affiliations",
				"last_known_institutions"
			]
		});
	}

	/**
   * Extract outbound edges from author (affiliations with institutions)
   */
	protected extractOutboundEdges(author: Author): Array<{
		targetId: string;
		relationType: RT;
		weight?: number;
		label?: string;
	}> {
		const edges: Array<{
			targetId: string;
			relationType: RT;
			weight?: number;
			label?: string;
		}> = [];

		// Add institution affiliations
		if (author.affiliations.length > 0) {
			author.affiliations.forEach(affiliation => {
				edges.push({
					targetId: affiliation.institution.id,
					relationType: RT.AFFILIATED,
					weight: 1.0,
					label: "affiliated with"
				});
			});
		}

		return edges;
	}
}