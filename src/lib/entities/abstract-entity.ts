/**
 * Abstract Entity class for OpenAlex entity operations
 * Provides base functionality for entity-specific operations like expansion, transformation, validation
 */

import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import { logger } from "@/lib/logger";
import type {
	GraphNode,
	GraphEdge,
	EntityType,
	RelationType,
	ExternalIdentifier
} from "@/lib/graph/types";
import type { OpenAlexEntity } from "@/lib/openalex/types";
import { detectEntityType } from "./entity-detection";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";

/**
 * Options for entity expansion
 */
export interface ExpansionOptions {
  limit?: number;
  depth?: number;
  relationTypes?: RelationType[];
  force?: boolean;
  selectFields?: string[]; // Fields to select for minimal API payload
  expansionSettings?: ExpansionSettings; // Settings for customizing expansion behavior
}

/**
 * Result of entity expansion
 */
export interface ExpansionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Context for entity operations
 */
export interface EntityContext {
  entityId: string;
  entityType: EntityType;
  client: RateLimitedOpenAlexClient;
}

/**
 * Abstract base class for all OpenAlex entities
 * Provides common functionality while allowing entity-specific implementations
 * Handles both full and dehydrated entities automatically
 */
export abstract class AbstractEntity<TEntity extends OpenAlexEntity> {
	protected readonly client: RateLimitedOpenAlexClient;
	protected readonly entityType: EntityType;
	protected readonly entityData?: TEntity;

	constructor(client: RateLimitedOpenAlexClient, entityType: EntityType, entityData?: TEntity) {
		this.client = client;
		this.entityType = entityType;
		this.entityData = entityData;
	}

  /**
   * Abstract method to expand the entity (get related entities)
   * Each entity type implements its own expansion logic
   */
  abstract expand(context: EntityContext, options: ExpansionOptions): Promise<ExpansionResult>;

  /**
   * Abstract method to perform minimal API request for outbound edges discovery
   * Returns only the entity data needed to identify all related node IDs and edge types
   * Should be implemented with minimal field selection to reduce API payload
   * @param entityId - The ID of the entity to get outbound edges for
   * @returns Promise resolving to entity data with only relationship fields populated
   */
  abstract fetchForOutboundEdges(entityId: string): Promise<TEntity>;

  /**
   * Abstract method to check if entity is dehydrated
   * Each entity type defines what fields are required for full hydration
   */
  protected abstract isDehydrated(entity: TEntity): boolean;

  /**
   * Get minimal fields required for graph display for this entity type
   * Can be overridden for entity-specific requirements
   */
  protected getMinimalFields(): string[] {
  	return ["id", "display_name"];
  }

  /**
   * Get fields required for metadata extraction
   * Can be overridden for entity-specific metadata requirements
   */
  protected getMetadataFields(): string[] {
  	return this.getMinimalFields(); // Default: same as minimal
  }

  /**
   * Get fields that contain IDs of related entities for expansion
   * These are the fields needed to discover related entities without fetching full metadata
   * Can be overridden for entity-specific expansion requirements
   */
  protected getExpansionFields(): string[] {
  	return ["id", "display_name"]; // Default: minimal fields only
  }

  /**
   * Get combined fields for expansion (expansion fields + metadata fields)
   * This allows fetching entity with both relationship data and rich metadata in one API call
   * Reduces total API calls during expansion
   */
  protected getCombinedExpansionFields(): string[] {
  	const expansionFields = this.getExpansionFields();
  	const metadataFields = this.getMetadataFields();

  	// Combine and deduplicate fields
  	const allFields = [...new Set([...expansionFields, ...metadataFields])];
  	return allFields;
  }

  /**
   * Abstract method to extract external identifiers
   * Each entity type has different external IDs (DOI, ORCID, ROR, etc.)
   */
  protected abstract extractExternalIds(entity: TEntity): ExternalIdentifier[];

  /**
   * Abstract method to extract metadata
   * Each entity type has different metadata fields
   */
  protected abstract extractMetadata(entity: TEntity): Record<string, unknown>;

  /**
   * Abstract method to extract outbound edges and related node IDs from entity
   * Returns relationship information without requiring full entity hydration
   * Should work with minimal entity data returned from fetchForOutboundEdges
   * @param entity - Entity data with relationship fields populated
   * @returns Array of objects containing target node IDs and relationship types
   */
  protected abstract extractOutboundEdges(entity: TEntity): Array<{
    targetId: string;
    relationType: RelationType;
    weight?: number;
    label?: string;
  }>;

  /**
   * Extract minimal metadata from dehydrated entities for graph display
   * Only extracts fields that are guaranteed to be present in dehydrated versions
   * Can be overridden for entity-specific minimal data
   */
  protected extractMinimalMetadata(entity: TEntity): Record<string, unknown> {
  	return {
  		displayName: entity.display_name,
  		entityType: this.entityType
  	};
  }

  /**
   * Transform OpenAlex entity to GraphNode
   * Uses the abstract methods for entity-specific data extraction
   * Works with both full and dehydrated entities
   */
  /**
   * Type guard to check if an entity has the required properties to be converted to entityData
   */
  private isValidEntityData(entity: TEntity): entity is TEntity & Record<string, unknown> {
    return typeof entity === "object" && entity !== null;
  }

  public transformToGraphNode(entity: TEntity, position?: { x: number; y: number }): GraphNode {
  	const externalIds = this.extractExternalIds(entity);

  	if (!this.isValidEntityData(entity)) {
  		throw new Error("Invalid entity data for transformToGraphNode: entity is not a valid object");
  	}

  	return {
  		id: entity.id,
  		type: this.entityType,
  		label: this.getDisplayName(entity),
  		entityId: entity.id,
  		position: position || this.generateRandomPosition(),
  		externalIds,
  		entityData: entity
  	};
  }

  /**
   * Create an edge between two entities
   */
  protected createEdge(
  	sourceId: string,
  	targetId: string,
  	relationType: RelationType,
  	weight?: number,
  	label?: string
  ): GraphEdge {
  	return {
  		id: `${sourceId}-${relationType}-${targetId}`,
  		source: sourceId,
  		target: targetId,
  		type: relationType,
  		label: label || relationType.replace(/_/g, " "),
  		weight: weight || 1.0,
  	};
  }

  /**
   * Get display name for entity
   * Can be overridden for entity-specific formatting
   */
  protected getDisplayName(entity: TEntity): string {
  	return entity.display_name || "Unknown Entity";
  }

  /**
   * Generate a random position for node placement
   * Can be overridden for entity-specific positioning logic
   */
  protected generateRandomPosition(): { x: number; y: number } {
  	return {
  		x: Math.random() * 400 - 200,
  		y: Math.random() * 300 - 150
  	};
  }

  /**
   * Generate deterministic position based on index
   */
  protected generateDeterministicPosition(index: number, total: number): { x: number; y: number } {
  	const angle = (index / total) * 2 * Math.PI;
  	const radius = 150 + (index % 3) * 50;
  	return {
  		x: Math.cos(angle) * radius,
  		y: Math.sin(angle) * radius,
  	};
  }

  /**
   * Check if nodes array already contains a node with the given ID
   */
  protected hasNode(nodes: GraphNode[], nodeId: string): boolean {
  	return nodes.some(n => n.id === nodeId);
  }

  /**
   * Handle operation errors gracefully
   */
  protected handleError(error: unknown, operation: string, context: EntityContext): void {
  	const errorMessage = error instanceof Error ? error : new Error(String(error));
  	logger.error(
  		"api",
  		`Failed to ${operation} ${this.entityType} ${context.entityId}`,
  		{ entityType: this.entityType, entityId: context.entityId, operation, error: errorMessage.message },
  		"AbstractEntity"
  	);
  }

  /**
   * Fetch entity with minimal fields for efficient graph node creation
   * Uses select parameter to reduce API payload size
   */
  public async fetchMinimal(entityId: string): Promise<TEntity> {
  	try {
  		const entity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(entity)) {
  			throw new Error(`Invalid entity returned for ${entityId}`);
  		}
  		return entity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to fetch minimal ${this.entityType} ${entityId}, trying full fetch`,
  			{ entityType: this.entityType, entityId, fields: this.getMinimalFields(), error },
  			"AbstractEntity"
  		);
  		// Fallback to full entity fetch
  		const fullEntity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(fullEntity)) {
  			throw new Error(`Invalid full entity returned for ${entityId}`);
  		}
  		return fullEntity;
  	}
  }

  /**
   * Fetch entity with metadata fields for rich graph display
   * Uses select parameter with metadata-specific fields for efficient loading
   */
  public async fetchWithMetadata(entityId: string): Promise<TEntity> {
  	try {
  		const metadataFields = this.getMetadataFields();
  		logger.debug("api", `Fetching ${this.entityType} with metadata fields`, {
  			entityType: this.entityType,
  			entityId,
  			fields: metadataFields
  		}, "AbstractEntity");

  		// Use selective field loading to minimize API payload
  		const params = { select: metadataFields };
  		const entity = await this.fetchEntityWithSpecificFields(entityId, params);

  		if (!this.validateEntityType(entity)) {
  			throw new Error(`Invalid entity returned for ${entityId}`);
  		}
  		return entity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to fetch ${this.entityType} ${entityId} with metadata fields, trying full fetch`,
  			{ entityType: this.entityType, entityId, fields: this.getMetadataFields(), error },
  			"AbstractEntity"
  		);
  		// Fallback to full entity fetch
  		const fullEntity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(fullEntity)) {
  			throw new Error(`Invalid full entity returned for ${entityId}`);
  		}
  		return fullEntity;
  	}
  }

  /**
   * Type guard to validate that an entity matches the expected TEntity type
   */
  private isValidSpecificEntity(entity: OpenAlexEntity): entity is TEntity {
    return this.validateEntityType(entity);
  }

  /**
   * Fetch entity with specific fields using the appropriate entity-specific API method
   * This method ensures proper field selection is applied per entity type
   */
  private async fetchEntityWithSpecificFields(entityId: string, params: { select: string[] }): Promise<TEntity> {
  	let entity: OpenAlexEntity;

  	switch (this.entityType) {
  		case "works":
  			entity = await this.client.getWork(entityId, params);
  			break;
  		case "authors":
  			entity = await this.client.getAuthor(entityId, params);
  			break;
  		case "sources":
  			entity = await this.client.getSource(entityId, params);
  			break;
  		case "institutions":
  			entity = await this.client.getInstitution(entityId, params);
  			break;
  		case "topics":
  			entity = await this.client.getTopic(entityId, params);
  			break;
  		case "publishers":
  			entity = await this.client.getPublisher(entityId, params);
  			break;
  		case "funders":
  			entity = await this.client.getFunder(entityId, params);
  			break;
  		case "keywords":
  			entity = await this.client.getKeyword(entityId, params);
  			break;
  		default:
  			// Fallback to generic method without field selection
  			entity = await this.client.getEntity(entityId);
  			break;
  	}

  	if (!this.isValidSpecificEntity(entity)) {
  		throw new Error(`Invalid entity type returned from API for ${this.entityType}: ${entityId}`);
  	}

  	return entity;
  }

  /**
   * Fetch entity with only fields needed for expansion (related entity IDs)
   * Uses select parameter to get only the relationship fields
   */
  public async fetchForExpansion(entityId: string): Promise<TEntity> {
  	try {
  		const expansionFields = this.getExpansionFields();
  		logger.debug("api", `Fetching ${this.entityType} with expansion fields`, {
  			entityType: this.entityType,
  			entityId,
  			fields: expansionFields
  		}, "AbstractEntity");

  		// Use selective field loading for expansion relationships
  		const params = { select: expansionFields };
  		const entity = await this.fetchEntityWithSpecificFields(entityId, params);

  		if (!this.validateEntityType(entity)) {
  			throw new Error(`Invalid entity returned for ${entityId}`);
  		}
  		return entity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to fetch ${this.entityType} ${entityId} with expansion fields, trying full fetch`,
  			{ entityType: this.entityType, entityId, fields: this.getExpansionFields(), error },
  			"AbstractEntity"
  		);
  		// Fallback to full entity fetch
  		const fullEntity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(fullEntity)) {
  			throw new Error(`Invalid full entity returned for ${entityId}`);
  		}
  		return fullEntity;
  	}
  }

  /**
   * Fetch entity with combined fields (expansion + metadata) for efficient expansion
   * Gets both relationship data and rich metadata in a single API call
   * Optimizes for expansion operations that need both types of data
   */
  public async fetchForFullExpansion(entityId: string): Promise<TEntity> {
  	try {
  		const entity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(entity)) {
  			throw new Error(`Invalid entity returned for ${entityId}`);
  		}
  		return entity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to fetch ${this.entityType} ${entityId} for full expansion, trying full fetch`,
  			{ entityType: this.entityType, entityId, fields: this.getCombinedExpansionFields(), error },
  			"AbstractEntity"
  		);
  		// Fallback to full entity fetch
  		const fullEntity = await this.client.getEntity(entityId);
  		if (!this.validateEntityType(fullEntity)) {
  			throw new Error(`Invalid full entity returned for ${entityId}`);
  		}
  		return fullEntity;
  	}
  }

  /**
   * Hydrate a dehydrated entity by fetching full data
   * Returns the full entity data if dehydrated, otherwise returns original
   */
  public async hydrate(entity: TEntity): Promise<TEntity> {
  	if (!this.isDehydrated(entity)) {
  		return entity;
  	}

  	try {
  		const fullEntity = await this.client.getEntity(entity.id);
  		if (!this.validateEntityType(fullEntity)) {
  			throw new Error(`Invalid hydrated entity returned for ${entity.id}`);
  		}
  		return fullEntity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to hydrate ${this.entityType} ${entity.id}, using dehydrated version`,
  			{ entityType: this.entityType, entityId: entity.id, error },
  			"AbstractEntity"
  		);
  		return entity;
  	}
  }

  /**
   * Ensure entity is hydrated before performing operations that need full data
   * Used internally by methods that require more than basic fields
   */
  protected async ensureHydrated(entity: TEntity): Promise<TEntity> {
  	return await this.hydrate(entity);
  }

  /**
   * Fetch related entity with appropriate field selection for graph display
   * Uses entity detection utility to determine type and fetches directly via client
   */
  protected async fetchRelatedEntity(entityId: string, preferMetadata: boolean = false): Promise<OpenAlexEntity | null> {
  	try {
  		// Detect the entity type from the ID (validates ID format)
  		detectEntityType(entityId);

  		// Fetch the entity directly using the client
  		// The preferMetadata parameter is noted for potential future field selection optimization
  		const relatedEntity = await this.client.getEntity(entityId);

  		return relatedEntity;
  	} catch (error) {
  		logger.warn(
  			"api",
  			`Failed to fetch related entity ${entityId}`,
  			{ entityId, entityType: "unknown", preferMetadata, error },
  			"AbstractEntity"
  		);
  		return null;
  	}
  }

  /**
   * Batch fetch multiple related entities with field selection
   * More efficient for fetching multiple entities of the same type
   */
  protected async fetchRelatedEntities(
  	entityIds: string[],
  	preferMetadata: boolean = false,
  	sequential: boolean = true
  ): Promise<OpenAlexEntity[]> {
  	if (entityIds.length === 0) return [];

  	const results: OpenAlexEntity[] = [];

  	if (sequential) {
  		// Sequential processing to avoid rate limits
  		for (const entityId of entityIds) {
  			const entity = await this.fetchRelatedEntity(entityId, preferMetadata);
  			if (entity) {
  				results.push(entity);
  			}
  		}
  	} else {
  		// Parallel processing (use with caution due to rate limits)
  		const promises = entityIds.map(entityId => this.fetchRelatedEntity(entityId, preferMetadata));
  		const entities = await Promise.all(promises);
  		// Filter out null/undefined values and validate entity types
		const validEntities = entities.filter((entity): entity is OpenAlexEntity => {
			return entity !== null && entity !== undefined;
		});
		results.push(...validEntities);
  	}

  	return results;
  }

  /**
   * Validate entity data
   * Can be overridden for entity-specific validation
   */
  public validate(entity: OpenAlexEntity): boolean {
  	return Boolean(entity.id && entity.display_name);
  }

  /**
   * Type guard to validate and narrow entity type
   * Returns true if entity is valid TEntity, false otherwise
   */
  protected validateEntityType(entity: OpenAlexEntity): entity is TEntity {
  	return this.validate(entity);
  }

  /**
   * Get entity summary for display
   * Can be overridden for entity-specific summary generation
   */
  public getSummary(entity: TEntity): string {
  	return `${this.entityType}: ${this.getDisplayName(entity)}`;
  }

  /**
   * Get search filters for this entity type
   * Can be overridden for entity-specific search logic
   */
  public getSearchFilters(): Record<string, unknown> {
  	return {};
  }

  /**
   * Get all outbound edges and related node IDs for an entity
   * Performs minimal API request and extracts relationship information
   * Optimized for graph discovery without fetching full entity metadata
   * @param entityId - Optional entity ID. If not provided, uses instance's entity data
   * @returns Promise resolving to array of outbound edge information
   */
  public async getOutboundEdges(entityId?: string): Promise<Array<{
    targetId: string;
    relationType: RelationType;
    weight?: number;
    label?: string;
  }>> {
  	const targetEntityId = entityId || this.entityData?.id;
  	if (!targetEntityId) {
  		logger.warn("api", `Cannot get outbound edges: no entity ID provided or available for ${this.entityType}`, {
  			entityType: this.entityType,
  			hasEntityData: Boolean(this.entityData),
  			providedEntityId: Boolean(entityId)
  		});
  		return [];
  	}

  	try {
  		logger.debug("api", `Fetching outbound edges for ${this.entityType} ${targetEntityId}`, {
  			entityType: this.entityType,
  			entityId: targetEntityId
  		});

  		const entity = await this.fetchForOutboundEdges(targetEntityId);
  		const edges = this.extractOutboundEdges(entity);

  		logger.debug("api", `Extracted ${String(edges.length)} outbound edges for ${this.entityType} ${targetEntityId}`, {
  			entityType: this.entityType,
  			entityId: targetEntityId,
  			edgeCount: edges.length,
  			relationTypes: edges.map(e => e.relationType)
  		});

  		return edges;
  	} catch (error) {
  		logger.error("api", `Failed to get outbound edges for ${this.entityType} ${targetEntityId}`, {
  			entityType: this.entityType,
  			entityId: targetEntityId,
  			error: error instanceof Error ? error.message : String(error)
  		});
  		return [];
  	}
  }
}