/**
 * Entity Factory for creating entity instances
 * Implements the Factory pattern for entity creation and management
 */

import type { CachedOpenAlexClient } from "@/lib/openalex/cached-client";
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
export class EntityFactory {
	private static readonly entities = new Map<EntityType, new (client: CachedOpenAlexClient, entityData?: unknown) => AbstractEntity<OpenAlexEntity>>();

	// Instance property to satisfy no-extraneous-class rule
	public readonly factoryType = "entity";

	// Private constructor to prevent external instantiation
	private constructor() {}

	/**
   * Register entity classes
   */
	/**
	 * Type guard to validate entity class constructor
	 */
	private static isValidEntityConstructor(
		constructor: unknown
	): constructor is new (client: CachedOpenAlexClient, entityData?: unknown) => AbstractEntity<OpenAlexEntity> {
		return typeof constructor === "function";
	}

	static {
		if (EntityFactory.isValidEntityConstructor(WorkEntity)) {
			EntityFactory.entities.set("works", WorkEntity);
		}
		if (EntityFactory.isValidEntityConstructor(AuthorEntity)) {
			EntityFactory.entities.set("authors", AuthorEntity);
		}
		// EntityFactory.entities.set('sources', SourceEntity);
		// EntityFactory.entities.set('institutions', InstitutionEntityClass);
	}

	/**
   * Create an entity instance based on type
   */
	static create(
		entityType: EntityType,
		client: CachedOpenAlexClient,
		entityData?: OpenAlexEntity
	): AbstractEntity<OpenAlexEntity> {
		const EntityClass = this.entities.get(entityType);

		if (!EntityClass) {
			throw new Error(`No entity class registered for type: ${entityType}`);
		}

		// Create and return the instance
		const instance = new EntityClass(client, entityData);
		return instance;
	}

	/**
   * Create entity from OpenAlex data with automatic type detection
   */
	static createFromData(
		entityData: OpenAlexEntity,
		client: CachedOpenAlexClient
	): AbstractEntity<OpenAlexEntity> {
		const entityType = detectEntityType(entityData);
		return this.create(entityType, client, entityData);
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
		entityClass: new (client: CachedOpenAlexClient, entityData?: T) => AbstractEntity<T>
	): void {
		if (!EntityFactory.isValidEntityConstructor(entityClass)) {
			throw new Error(`Invalid entity class provided for registration: ${entityType}`);
		}
		this.entities.set(entityType, entityClass);
	}
}