/**
 * Entity Factory for creating entity instances
 * Implements the Factory pattern for entity creation and management
 */

import type { RateLimitedOpenAlexClient } from "@/lib/openalex/rate-limited-client";
import type { EntityType } from "@/lib/graph/types";
import type { OpenAlexEntity } from "@/lib/openalex/types";

import { AbstractEntity } from "./abstract-entity";
import { WorkEntity } from "./work-entity";
import { AuthorEntity } from "./author-entity";
import { detectEntityType } from "./entity-detection";

// Import other entity types as they're created
// import { SourceEntity } from './source-entity';
// import { InstitutionEntity as InstitutionEntityClass } from './institution-entity';

/**
 * Factory for creating entity instances based on type
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EntityFactory {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static readonly entities = new Map<EntityType, new (client: RateLimitedOpenAlexClient, entityData?: any) => AbstractEntity<any>>();

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

		return new EntityClass(client, entityData as OpenAlexEntity) as AbstractEntity<T>;
	}

	/**
   * Create entity from OpenAlex data with automatic type detection
   */
	static createFromData<T extends OpenAlexEntity>(
		entityData: T,
		client: RateLimitedOpenAlexClient
	): AbstractEntity<T> {
		const entityType = detectEntityType(entityData);
		return this.create(entityType, client, entityData);
	}

	/**
   * Detect entity type from OpenAlex ID or entity data
   * @deprecated Use detectEntityType from entity-detection.ts instead
   */
	static detectEntityType(entityOrId: OpenAlexEntity | string): EntityType {
		return detectEntityType(entityOrId);
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