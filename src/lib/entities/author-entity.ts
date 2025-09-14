/**
 * Author entity implementation
 * Handles author-specific operations like expanding works and collaborations
 */

import { AbstractEntity, type EntityContext, type ExpansionOptions, type ExpansionResult } from "./abstract-entity";
import type { Author } from "@/lib/openalex/types";
import type { ExternalIdentifier } from "@/lib/graph/types";
import { RelationType as RT } from "@/lib/graph/types";

export class AuthorEntity extends AbstractEntity<Author> {
	constructor(client: any, entityData?: Author) {
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
		// An author is dehydrated if it's missing works_count or cited_by_count
		return author.works_count === undefined || author.cited_by_count === undefined;
	}

	/**
   * Expand an author to show recent works and collaborations
   */
	async expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult> {
		const nodes: any[] = [];
		const edges: any[] = [];
		const { limit = 10 } = options;

		try {
			// Fetch the author's recent works
			const worksQuery = await this.client.getWorks({
				filter: `authorships.author.id:${context.entityId}`,
				per_page: Math.min(limit, 8),
				sort: "publication_year:desc"
			});

			worksQuery.results.forEach((work: any) => {
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
						openAccess: work.open_access?.is_oa,
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

				// Add co-authors from the first few works to show collaboration
				if (nodes.length <= 3 && work.authorships) { // Only for first few works to avoid clutter
					work.authorships.slice(0, 3).forEach((authorship: any) => {
						if (authorship.author.id !== context.entityId) { // Skip the main author
							const coAuthorNode = {
								id: authorship.author.id,
								type: "authors" as const,
								label: authorship.author.display_name || "Unknown Author",
								entityId: authorship.author.id,
								position: this.generateRandomPosition(),
								externalIds: authorship.author.orcid ? [{
									type: "orcid" as const,
									value: authorship.author.orcid,
									url: `https://orcid.org/${authorship.author.orcid}`,
								}] : [],
								metadata: {},
							};

							// Only add if not already present
							if (!this.hasNode(nodes, coAuthorNode.id)) {
								nodes.push(coAuthorNode);

								// Add co-authorship edge
								edges.push(this.createEdge(
									context.entityId,
									authorship.author.id,
									RT.CO_AUTHORED,
									0.5,
									"collaborated"
								));

								// Add co-author to work edge
								edges.push(this.createEdge(
									authorship.author.id,
									work.id,
									RT.AUTHORED,
									0.7,
									"authored"
								));
							}
						}
					});
				}
			});

		} catch (error) {
			this.handleError(error, "expand", context);
		}

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
			affiliations: author.affiliations?.map(a => a.institution.display_name) || [],
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
		const works = author.works_count ? ` (${author.works_count} works)` : "";
		const institutionText = institution ? ` - ${institution}` : "";

		return `${name}${institutionText}${works}`;
	}
}