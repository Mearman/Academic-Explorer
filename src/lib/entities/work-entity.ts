/**
 * Work entity implementation
 * Handles work-specific operations like expanding citations and references
 */

import { AbstractEntity, type EntityContext, type ExpansionOptions, type ExpansionResult } from "./abstract-entity";
import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import type { Work } from "@/lib/openalex/types";
import type { ExternalIdentifier, GraphNode, GraphEdge } from "@/lib/graph/types";
import { RelationType as RT } from "@/lib/graph/types";

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
		// A work is dehydrated if it's missing publication_year or cited_by_count
		return work.publication_year === undefined || work.cited_by_count === undefined;
	}

	/**
   * Expand a work to show citations and references
   */
	async expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult> {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const { limit = 10 } = options;

		try {
			// Fetch the work with all fields needed for expansion and metadata in one API call
			const work = await this.fetchForFullExpansion(context.entityId);

			// Add citations (works that cite this work)
			if (work.cited_by_count > 0) {
				const citationsQuery = await this.client.getWorks({
					filter: `referenced_works:${context.entityId}`,
					per_page: Math.min(limit, 5), // Limit citations to avoid clutter
					sort: "cited_by_count:desc"
				});

				citationsQuery.results.forEach((citingWork: Work) => {
					const citingNode = this.transformToGraphNode(citingWork);
					nodes.push(citingNode);

					// Add citation edge
					edges.push(this.createEdge(
						citingWork.id,
						context.entityId,
						RT.CITED,
						1.0,
						"cites"
					));
				});
			}

			// Add references (works this work cites) - sequentially to avoid rate limiting
			if (work.referenced_works && work.referenced_works.length > 0) {
				const referencesSlice = work.referenced_works.slice(0, Math.min(limit, 5));

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
			openAccess: work.open_access?.is_oa,
			authorCount: work.authorships?.length || 0,
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
		const year = work.publication_year ? ` (${work.publication_year})` : "";
		const citations = work.cited_by_count ? ` - ${work.cited_by_count} citations` : "";
		return `${this.getDisplayName(work)}${year}${citations}`;
	}
}