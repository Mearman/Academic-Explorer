/**
 * Entity system exports
 */

export { AbstractEntity } from "./abstract-entity";
export { WorkEntity } from "./work-entity";
export { AuthorEntity } from "./author-entity";
export { EntityFactory } from "./entity-factory";
export { detectEntityType } from "./entity-detection";

export type {
	ExpansionOptions,
	ExpansionResult,
	EntityContext
} from "./abstract-entity";