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

		logger.info("graph", "WorkEntity.expand called", {
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
				const citationsPerPage = Math.min(effectiveLimit, 5); // Limit citations to avoid clutter

				// Merge base filter with expansion settings filters if available
				const baseFilter = `referenced_works:${context.entityId}`;
				const finalFilter = queryParams.filter
					? ExpansionQueryBuilder.mergeFilters(baseFilter, expansionSettings?.filters || [])
					: baseFilter;

				const citationsQuery = await this.client.getWorks({
					filter: finalFilter,
					per_page: citationsPerPage,
					sort: queryParams.sort || "cited_by_count:desc",
					select: queryParams.select
				});

				logger.debug("graph", "Citations query result", {
					resultCount: citationsQuery.results.length,
					totalCount: citationsQuery.meta.count,
					entityId: context.entityId,
					filter: finalFilter,
					sort: queryParams.sort || "cited_by_count:desc"
				}, "WorkEntity");

				citationsQuery.results.forEach((citingWork: Work) => {
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
				const referencesSlice = work.referenced_works.slice(0, Math.min(effectiveLimit, 5));

				logger.debug("graph", "Fetching referenced works", {
					referencesCount: referencesSlice.length,
					totalReferences: work.referenced_works.length,
					entityId: context.entityId
				}, "WorkEntity");

				// Use the abstract helper to fetch related works with minimal fields
				const relatedWorks = await this.fetchRelatedEntities(referencesSlice, false, true);

				relatedWorks.forEach((refWork) => {
					const refNode = this.transformToGraphNode(refWork as Work);
					nodes.push(refNode);

					// Add reference edge
					edges.push(this.createEdge(
						context.entityId,
						refWork.id,
						RT.REFERENCES,
						1.0,
						"references"
					));
				});
			}

		} catch (error) {
			this.handleError(error, "expand", context);
		}

		logger.info("graph", "WorkEntity.expand completed", {
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
}