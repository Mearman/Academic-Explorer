/**
 * Work entity implementation
 * Handles work-specific operations like expanding citations and references
 */

import { AbstractEntity, type EntityContext, type ExpansionOptions, type ExpansionResult } from "./abstract-entity";
import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import type { Work } from "@/lib/openalex/types";
import type { ExternalIdentifier, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType as RT } from "@/lib/graph/types";
import { ExpansionQueryBuilder } from "@/services/expansion-query-builder";
import { logger } from "@/lib/logger";

export class WorkEntity extends AbstractEntity<Work> {
	constructor(client: RateLimitedOpenAlexClient, entityData?: Work) {
		super(client, "works", entityData);
	}

	/**
   * Get minimal fields for work display in graph
   */
	protected getMinimalFields(): string[] {
		return ["id", "display_name"];
	}

	/**
   * Get metadata fields for rich work display
   */
	protected getMetadataFields(): string[] {
		return [
			"id",
			"display_name",
			"publication_year",
			"cited_by_count",
			"doi",
			"open_access",
			"type",
			"authorships",
			"primary_location"
		];
	}

	/**
   * Get fields that contain IDs of related entities for expansion
   */
	protected getExpansionFields(): string[] {
		return [
			"id",
			"display_name",
			"referenced_works",      // IDs of works this work references
			"related_works",         // IDs of related works
			"authorships",           // Contains author IDs and institution IDs
			"primary_location",      // Contains source/journal ID
			"locations",             // Contains additional source IDs
			"concepts",              // Contains concept IDs
			"topics",                // Contains topic IDs
			"grants",                // Contains funder IDs
			"mesh"                   // Contains MeSH concept IDs
		];
	}

	/**
   * Check if work entity is dehydrated (missing key fields)
   */
	protected isDehydrated(work: Work): boolean {
		// A work is dehydrated if it's missing publication_year
		return work.publication_year === undefined;
	}

	/**
   * Expand a work to show citations and references
   */
	async expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult> {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const { limit = 10, expansionSettings } = options;

		logger.debug("graph", "WorkEntity.expand called", {
			contextEntityId: context.entityId,
			limit,
			hasExpansionSettings: Boolean(expansionSettings),
			options
		}, "WorkEntity");

		try {
			// Fetch the work with all fields needed for expansion and metadata in one API call
			const work = await this.fetchForFullExpansion(context.entityId);

			// Get expansion settings, with fallback to defaults
			const effectiveLimit = expansionSettings?.enabled ? expansionSettings.limit : limit;

			// Fetch all results with pagination if no limit specified, or fetch up to limit
			const shouldFetchAll = !effectiveLimit || effectiveLimit <= 0 || effectiveLimit >= 10000;

			// Build query parameters from expansion settings if available
			let queryParams: { filter?: string; sort?: string; select?: string[] } = {};
			if (expansionSettings?.enabled) {
				const builtParams = ExpansionQueryBuilder.buildQueryParams(expansionSettings);
				queryParams = {
					filter: builtParams.filter,
					sort: builtParams.sort,
					select: builtParams.select
				};
				logger.debug("graph", "Using expansion settings for work expansion", {
					settings: expansionSettings,
					queryParams
				}, "WorkEntity");
			}

			// Add citations (works that cite this work)
			if (work.cited_by_count > 0) {
				// Merge base filter with expansion settings filters if available
				const baseFilter = `referenced_works:${context.entityId}`;
				const finalFilter = queryParams.filter
					? ExpansionQueryBuilder.mergeFilters(baseFilter, expansionSettings?.filters || [])
					: baseFilter;

				// Fetch all citations with pagination if no limit specified, or fetch up to limit
				let allCitations: Work[] = [];
				let page = 1;
				let totalFetched = 0;

				logger.debug("graph", "Starting citations fetch", {
					shouldFetchAll,
					effectiveLimit,
					entityId: context.entityId
				}, "WorkEntity");

				do {
					const citationsQuery = await this.client.getWorks({
						filter: finalFilter,
						per_page: 200, // Always use maximum per page
						page: page,
						sort: queryParams.sort,
						select: queryParams.select
					});

					if (citationsQuery.results.length === 0) {
						break; // No more results
					}

					allCitations.push(...citationsQuery.results);
					totalFetched += citationsQuery.results.length;

					logger.debug("graph", "Fetched citations page", {
						page,
						pageResults: citationsQuery.results.length,
						totalFetched,
						totalAvailable: citationsQuery.meta.count,
						entityId: context.entityId
					}, "WorkEntity");

					// Check if we have enough results or if this was the last page
					if (!shouldFetchAll && totalFetched >= effectiveLimit) {
						allCitations = allCitations.slice(0, effectiveLimit); // Trim to exact limit
						break;
					}

					if (citationsQuery.results.length < 200) {
						// Last page (partial page means no more results)
						break;
					}

					page++;
				} while (shouldFetchAll || totalFetched < effectiveLimit);

				logger.debug("graph", "Completed citations fetch", {
					totalFetched: allCitations.length,
					pagesProcessed: page,
					entityId: context.entityId
				}, "WorkEntity");

				allCitations.forEach((citingWork: Work) => {
					const citingNode = this.transformToGraphNode(citingWork);
					nodes.push(citingNode);

					// Add citation edge (citing work references this work)
					edges.push(this.createEdge(
						citingWork.id,
						context.entityId,
						RT.REFERENCES,
						1.0,
						"references"
					));
				});
			}

			// Add references (works this work cites) - sequentially to avoid rate limiting
			if (work.referenced_works.length > 0) {
				// Apply limit to references if specified
				const referencesSlice = shouldFetchAll || !effectiveLimit || effectiveLimit <= 0
					? work.referenced_works
					: work.referenced_works.slice(0, effectiveLimit);

				logger.debug("graph", "Starting references fetch", {
					referencesCount: referencesSlice.length,
					totalReferences: work.referenced_works.length,
					entityId: context.entityId,
					shouldFetchAll
				}, "WorkEntity");

				// Use the abstract helper to fetch related works with minimal fields
				const relatedWorks = await this.fetchRelatedEntities(referencesSlice, false, true);

				relatedWorks.forEach((refWork) => {
					// Use the inherited validation method instead of custom type guard
					if (this.validateEntityType(refWork)) {
						const refNode = this.transformToGraphNode(refWork);
						nodes.push(refNode);

						// Add reference edge
						edges.push(this.createEdge(
							context.entityId,
							refWork.id,
							RT.REFERENCES,
							1.0,
							"references"
						));
					}
				});
			}

		} catch (error) {
			this.handleError(error, "expand", context);
		}

		logger.debug("graph", "WorkEntity.expand completed", {
			nodesAdded: nodes.length,
			edgesAdded: edges.length,
			contextEntityId: context.entityId
		}, "WorkEntity");

		return { nodes, edges };
	}

	/**
   * Extract external identifiers for works (DOI, etc.)
   */
	protected extractExternalIds(work: Work): ExternalIdentifier[] {
		const externalIds: ExternalIdentifier[] = [];

		if (work.doi) {
			externalIds.push({
				type: "doi",
				value: work.doi,
				url: `https://doi.org/${work.doi}`,
			});
		}

		return externalIds;
	}

	/**
   * Extract metadata specific to works
   */
	protected extractMetadata(work: Work): Record<string, unknown> {
		return {
			year: work.publication_year,
			citationCount: work.cited_by_count,
			openAccess: work.open_access.is_oa,
			authorCount: work.authorships.length,
			type: work.type,
			venue: work.primary_location?.source?.display_name,
		};
	}

	/**
   * Get work-specific display name (truncate if too long)
   */
	protected getDisplayName(work: Work): string {
		const name = work.display_name || "Untitled Work";
		return name.length > 60 ? `${name.substring(0, 57)}...` : name;
	}

	/**
   * Get work-specific search filters
   */
	public getSearchFilters(): Record<string, unknown> {
		return {
			type: "works",
			sort: "cited_by_count:desc",
			per_page: 25,
		};
	}

	/**
   * Get work summary including year and citation count
   */
	public getSummary(work: Work): string {
		const year = work.publication_year ? ` (${String(work.publication_year)})` : "";
		const citations = work.cited_by_count ? ` - ${String(work.cited_by_count)} citations` : "";
		return `${this.getDisplayName(work)}${year}${citations}`;
	}

	/**
   * Fetch work data with minimal fields needed for outbound edge extraction
   */
	async fetchForOutboundEdges(entityId: string): Promise<Work> {
		return await this.client.getWork(entityId, {
			select: [
				"id",
				"display_name",
				"authorships",
				"primary_location",
				"referenced_works"
			]
		});
	}

	/**
   * Extract outbound edges from work (authors, sources, references)
   */
	protected extractOutboundEdges(work: Work): Array<{
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

		// Add author relationships
		if (work.authorships.length > 0) {
			work.authorships.forEach(authorship => {
				edges.push({
					targetId: authorship.author.id,
					relationType: RT.AUTHORED,
					weight: 1.0,
					label: "authored"
				});
			});
		}

		// Add source relationship
		if (work.primary_location?.source) {
			edges.push({
				targetId: work.primary_location.source.id,
				relationType: RT.PUBLISHED_IN,
				weight: 1.0,
				label: "published in"
			});
		}

		// Add reference relationships (limit to first 5 to avoid overwhelming)
		if (work.referenced_works.length > 0) {
			work.referenced_works.slice(0, 5).forEach(refId => {
				edges.push({
					targetId: refId,
					relationType: RT.REFERENCES,
					weight: 0.5,
					label: "references"
				});
			});
		}

		return edges;
	}
}