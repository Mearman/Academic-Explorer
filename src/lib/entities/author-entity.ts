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
			"h_index",
			"affiliations",
			"last_known_institution"
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
	protected isDehydrated(author: Author): boolean {
		// Author entities are never considered dehydrated as all fields are always present
		return false;
	}

	/**
   * Expand an author to show recent works
   */
	async expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult> {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const { limit = 10 } = options;

		logger.info("graph", "AuthorEntity.expand called", {
			contextEntityId: context.entityId,
			limit,
			options
		}, "AuthorEntity");

		try {
			// Fetch the author's recent works
			logger.info("graph", "Fetching works for author", {
				entityId: context.entityId
			}, "AuthorEntity");

			const worksQuery = await this.client.getWorks({
				filter: `authorships.author.id:${context.entityId}`,
				per_page: Math.min(limit, 8),
				sort: "publication_year:desc"
			});

			logger.info("graph", "Works query result", {
				resultCount: worksQuery.results.length || 0,
				totalCount: worksQuery.meta.count || 0,
				entityId: context.entityId
			}, "AuthorEntity");

			worksQuery.results.forEach((work: Work) => {
				// Add work node
				const workNode = {
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

				// Note: Removed inferred collaboration edges - only show real relationships from data
			});

		} catch (error) {
			logger.error("graph", "Error in AuthorEntity.expand", {
				error: error instanceof Error ? error.message : "Unknown error",
				entityId: context.entityId
			}, "AuthorEntity");
			this.handleError(error, "expand", context);
		}

		logger.info("graph", "AuthorEntity.expand returning", {
			nodeCount: nodes.length,
			edgeCount: edges.length,
			entityId: context.entityId,
			nodes: nodes.map(n => ({ id: n.id, type: n.type, label: n.label }))
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
}