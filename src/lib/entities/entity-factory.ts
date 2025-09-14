/**
 * Entity Factory for creating entity instances
 * Implements the Factory pattern for entity creation and management
 */

import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import type { EntityType } from "@/lib/graph/types";
import type { OpenAlexEntity, Work, Author, Source, InstitutionEntity } from "@/lib/openalex/types";

import { AbstractEntity } from "./abstract-entity";
import { WorkEntity } from "./work-entity";
import { AuthorEntity } from "./author-entity";

// Import other entity types as they're created
// import { SourceEntity } from './source-entity';
// import { InstitutionEntity as InstitutionEntityClass } from './institution-entity';

/**
 * Factory for creating entity instances based on type
 */
export class EntityFactory {
	private static readonly entities = new Map<EntityType, any>();

	/**
   * Register entity classes
   */
	static {
		EntityFactory.entities.set("works", WorkEntity);
		EntityFactory.entities.set("authors", AuthorEntity);
		// EntityFactory.entities.set('sources', SourceEntity);
		// EntityFactory.entities.set('institutions', InstitutionEntityClass);
	}

	/**
   * Create an entity instance based on type
   */
	static create<T extends OpenAlexEntity>(
		entityType: EntityType,
		client: RateLimitedOpenAlexClient,
		entityData?: T
	): AbstractEntity<T> {
		const EntityClass = this.entities.get(entityType);

		if (!EntityClass) {
			throw new Error(`No entity class registered for type: ${entityType}`);
		}

		return new EntityClass(client, entityData) as AbstractEntity<T>;
	}

	/**
   * Create entity from OpenAlex data with automatic type detection
   */
	static createFromData<T extends OpenAlexEntity>(
		entityData: T,
		client: RateLimitedOpenAlexClient
	): AbstractEntity<T> {
		const entityType = this.detectEntityType(entityData);
		return this.create(entityType, client, entityData);
	}

	/**
   * Detect entity type from OpenAlex ID or entity data
   */
	static detectEntityType(entityOrId: OpenAlexEntity | string): EntityType {
		if (typeof entityOrId === "string") {
			// Detect from ID format (W123456789, A123456789, etc.)
			const match = entityOrId.match(/^https:\/\/openalex\.org\/([WASITP])\d+$/);
			if (match) {
				const prefix = match[1];
				return this.prefixToEntityType(prefix);
			}

			// Handle bare IDs
			const bareMatch = entityOrId.match(/^([WASITP])\d+$/);
			if (bareMatch) {
				const prefix = bareMatch[1];
				return this.prefixToEntityType(prefix);
			}

			throw new Error(`Cannot detect entity type from ID: ${entityOrId}`);
		}

		// Detect from entity data structure
		if ("authorships" in entityOrId) return "works";
		if ("works_count" in entityOrId && "orcid" in entityOrId) return "authors";
		if ("issn_l" in entityOrId) return "sources";
		if ("ror" in entityOrId) return "institutions";

		throw new Error("Cannot detect entity type from entity data");
	}

	/**
   * Convert OpenAlex ID prefix to entity type
   */
	private static prefixToEntityType(prefix: string): EntityType {
		switch (prefix) {
			case "W": return "works";
			case "A": return "authors";
			case "S": return "sources";
			case "I": return "institutions";
			case "T": return "topics";
			case "P": return "publishers";
			default:
				throw new Error(`Unknown entity prefix: ${prefix}`);
		}
	}

	/**
   * Get all registered entity types
   */
	static getRegisteredTypes(): EntityType[] {
		return Array.from(this.entities.keys());
	}

	/**
   * Check if an entity type is supported
   */
	static isSupported(entityType: EntityType): boolean {
		return this.entities.has(entityType);
	}

	/**
   * Register a new entity class
   */
	static register<T extends OpenAlexEntity>(
		entityType: EntityType,
		entityClass: new (client: RateLimitedOpenAlexClient, entityData?: T) => AbstractEntity<T>
	): void {
		this.entities.set(entityType, entityClass);
	}
}