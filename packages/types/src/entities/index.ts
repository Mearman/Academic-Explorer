// Re-export all entities, schemas, type guards, and common types
export * from "./base";
export * from "./common";
export * from "./entities";
export * from "./authors";
export * from "./concepts";
export * from "./filters";
export * from "./schemas";
export * from "./type-guards";
export * from "./validation";
export * from "./utils";
export * from "./works";
export * from "./sources";
export * from "./institutions";
export * from "./topics";
export * from "./publishers";
export * from "./funders";
export * from "./keywords";

// Type aliases for backward compatibility
import type { EntityType } from "./entities";
import type { QueryParams } from "./common";

export type OpenAlexEntityType = EntityType;
export type OpenAlexQueryParams = QueryParams;
