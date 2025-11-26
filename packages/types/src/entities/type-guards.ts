/**
 * Entity Type Guards and Utilities - Central functions for entity type detection
 */

import { isAuthor } from "./authors"
import { isConcept } from "./concepts"
import type { OpenAlexEntity, EntityType } from "./entities"
import { isFunder } from "./funders"
import { isInstitution } from "./institutions"
import { isKeyword } from "./keywords"
import { isPublisher } from "./publishers"
import { isSource } from "./sources"
import { isTopic } from "./topics"
import { isWork } from "./works"

export function getEntityType(entity: OpenAlexEntity): EntityType {
	if (isWork(entity)) return "works"
	if (isAuthor(entity)) return "authors"
	if (isSource(entity)) return "sources"
	if (isInstitution(entity)) return "institutions"
	if (isTopic(entity)) return "topics"
	if (isConcept(entity)) return "concepts"
	if (isPublisher(entity)) return "publishers"
	if (isFunder(entity)) return "funders"
	if (isKeyword(entity)) return "keywords"
	// This should never happen since OpenAlexEntity is a union of all entity types
	throw new Error(`Unknown entity type: ${JSON.stringify(entity)}`)
}

export function isOpenAlexEntity(entity: unknown): entity is OpenAlexEntity {
	return (
		isWork(entity) ||
		isAuthor(entity) ||
		isSource(entity) ||
		isInstitution(entity) ||
		isTopic(entity) ||
		isConcept(entity) ||
		isPublisher(entity) ||
		isFunder(entity) ||
		isKeyword(entity)
	)
}
