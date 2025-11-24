// Re-export everything from entities
export * from "./entities"

// Re-export relationship types
export { RelationType } from "./relationships"

// Re-export bookmark types
export type { Bookmark, BookmarkMetadata } from "./bookmark"
export { BookmarkSchema, BookmarkMetadataSchema } from "./bookmark"

// Re-export relationship type definitions
export type {
	GrantRelationship,
	GrantGraphEdge,
} from "./grants"
export {
	createGrantGraphEdge,
	isGrantRelationship,
} from "./grants"

export type {
	KeywordRelationship,
	KeywordGraphEdge,
} from "./keywords"
export {
	createKeywordGraphEdge,
	isKeywordRelationship,
} from "./keywords"

export type {
	ConceptRelationship,
	ConceptGraphEdge,
} from "./concepts"
export {
	createConceptGraphEdge,
	isConceptRelationship,
} from "./concepts"

export type {
	EnhancedTopicRelationship,
	EnhancedTopicGraphEdge,
} from "./topics"
export {
	createEnhancedTopicGraphEdge,
	isEnhancedTopicRelationship,
} from "./topics"

export type {
	RepositoryRelationship,
	RepositoryGraphEdge,
} from "./repositories"
export {
	createRepositoryGraphEdge,
	isRepositoryRelationship,
} from "./repositories"

export type {
	RoleRelationship,
	RoleGraphEdge,
} from "./roles"
export {
	createRoleGraphEdge,
	isRoleRelationship,
} from "./roles"

// Re-export bookmark error types
export {
	BookmarkError,
	BookmarkNotFoundError,
	BookmarkValidationError,
	BookmarkStorageError,
	DuplicateBookmarkError,
	BookmarkLimitExceededError,
	BookmarkErrorCode,
	validateBookmarkMetadata,
	validateBookmarkUrl,
	isBookmarkError,
	isBookmarkErrorCode,
} from "./errors/bookmark-errors"

// Re-export client types for compatibility
export type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	Topic,
	Publisher,
	Funder,
	OpenAlexEntity,
	EntityType,
	EntityTypeMap,
} from "./entities"

// Re-export graph types
export type {
	Position,
	ExternalIdentifier,
	GraphNode,
	EdgeDirection,
	GraphEdge,
	GraphLayout,
	GraphEvents,
	GraphOptions,
	EntityIdentifier,
	ProviderType,
	SearchOptions,
	SearchResult,
	GraphData,
	GraphCache,
	GraphStats,
	Community,
	ForceLink,
	ForceSimulationNode,
	ForceSimulationTask,
} from "./graph-types"

// Re-export expansion settings types
export type {
	ExpansionTarget,
	ExpansionOptions,
	SortCriteria,
	FilterOperator,
	FilterCriteria,
	ExpansionSettings,
	PropertyType,
	PropertyDefinition,
	EntityTypeProperties,
} from "./expansion-settings"
export {
	ENTITY_PROPERTIES,
	DEFAULT_EXPANSION_SETTINGS,
	getPropertiesForTarget,
	getDefaultSettingsForTarget,
	validateFilterCriteria,
} from "./expansion-settings"
