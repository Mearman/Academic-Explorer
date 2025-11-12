// Re-export everything from entities
export * from "./entities"

// Re-export bookmark types
export type { Bookmark, BookmarkMetadata } from "./bookmark"
export { BookmarkSchema, BookmarkMetadataSchema } from "./bookmark"

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
