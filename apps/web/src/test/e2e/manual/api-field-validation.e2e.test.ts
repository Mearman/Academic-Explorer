/**
 * API Field Validation E2E Tests
 *
 * Validates that the OpenAlex API returns all expected fields for each entity type.
 * This catches issues like:
 * - Invalid field names in ENTITY_FIELDS arrays
 * - API changes that remove fields
 * - Typos in field names
 * - Missing required fields
 *
 * This test would have caught the authorships_count bug that caused
 * https://mearman.github.io/Academic-Explorer/#/works/W2009047091 to fail.
 */

import { test, expect } from '@playwright/test';
import {
	WORK_FIELDS,
	AUTHOR_FIELDS,
	INSTITUTION_FIELDS,
	SOURCE_FIELDS,
	PUBLISHER_FIELDS,
	FUNDER_FIELDS,
	TOPIC_FIELDS,
	KEYWORD_FIELDS,
	type WorkField,
	type AuthorField,
	type InstitutionField,
	type SourceField,
	type PublisherField,
	type FunderField,
	type TopicField,
	type KeywordField,
} from '@academic-explorer/types/entities';

const API_BASE = 'https://api.openalex.org';

// Test entity IDs - using specific entities that are known to exist
const TEST_ENTITIES = {
	work: 'W2009047091', // The work that originally failed
	author: 'A5017898742',
	institution: 'I27837315',
	source: 'S137773608',
	publisher: 'P4310319900',
	funder: 'F4320308380',
	topic: 'T10159',
	keyword: 'K12345', // May need to find a valid keyword ID
} as const;

type EntityType = keyof typeof TEST_ENTITIES;

interface FieldValidationResult {
	entityType: EntityType;
	entityId: string;
	missingFields: string[];
	extraFields: string[];
	totalExpectedFields: number;
	totalActualFields: number;
}

/**
 * Fetch entity data from OpenAlex API without any select parameter
 * to get the default fields returned by the API.
 */
async function fetchEntityData(entityType: EntityType, entityId: string): Promise<Record<string, unknown>> {
	const url = `${API_BASE}/${entityType}s/${entityId}`;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`API request failed: ${response.status} ${response.statusText} for ${url}`);
	}

	return await response.json();
}

/**
 * Get expected fields for an entity type
 */
function getExpectedFields(entityType: EntityType): readonly string[] {
	switch (entityType) {
		case 'work':
			return WORK_FIELDS;
		case 'author':
			return AUTHOR_FIELDS;
		case 'institution':
			return INSTITUTION_FIELDS;
		case 'source':
			return SOURCE_FIELDS;
		case 'publisher':
			return PUBLISHER_FIELDS;
		case 'funder':
			return FUNDER_FIELDS;
		case 'topic':
			return TOPIC_FIELDS;
		case 'keyword':
			return KEYWORD_FIELDS;
		default:
			throw new Error(`Unknown entity type: ${entityType}`);
	}
}

/**
 * Validate that all expected fields are present in the API response
 */
function validateFields(
	entityType: EntityType,
	entityId: string,
	data: Record<string, unknown>,
	expectedFields: readonly string[]
): FieldValidationResult {
	const actualFields = Object.keys(data);
	const expectedFieldSet = new Set(expectedFields);
	const actualFieldSet = new Set(actualFields);

	// Find fields that are in ENTITY_FIELDS but not in the API response
	const missingFields = Array.from(expectedFields).filter(
		field => !actualFieldSet.has(field)
	);

	// Find fields in the API response that aren't in ENTITY_FIELDS
	// (This is just informational, not an error)
	const extraFields = actualFields.filter(
		field => !expectedFieldSet.has(field)
	);

	return {
		entityType,
		entityId,
		missingFields,
		extraFields,
		totalExpectedFields: expectedFields.length,
		totalActualFields: actualFields.length,
	};
}

test.describe('API Field Validation', () => {
	test.setTimeout(60000); // 1 minute per test

	test('Work entity should return all expected fields', async () => {
		const entityType = 'work';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		// Log results for debugging
		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		if (result.extraFields.length > 0) {
			console.log(`  ℹ️  Extra fields (${result.extraFields.length}):`, result.extraFields.slice(0, 10));
		}

		// The test fails if any expected fields are missing
		expect(result.missingFields).toEqual([]);
	});

	test('Author entity should return all expected fields', async () => {
		const entityType = 'author';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Institution entity should return all expected fields', async () => {
		const entityType = 'institution';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Source entity should return all expected fields', async () => {
		const entityType = 'source';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Publisher entity should return all expected fields', async () => {
		const entityType = 'publisher';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Funder entity should return all expected fields', async () => {
		const entityType = 'funder';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Topic entity should return all expected fields', async () => {
		const entityType = 'topic';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const data = await fetchEntityData(entityType, entityId);
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${result.totalExpectedFields}`);
		console.log(`  Actual fields: ${result.totalActualFields}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${result.missingFields.length}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});
});

test.describe('API Error Detection', () => {
	test.setTimeout(30000);

	test('Invalid select parameter should return 400 error', async () => {
		const url = `${API_BASE}/works/W2009047091?select=id,display_name,invalid_field_name`;

		const response = await fetch(url);

		// The API should return a 400 error for invalid field names
		expect(response.status).toBe(400);

		const data = await response.json();
		expect(data).toHaveProperty('error');
		expect(data.error).toContain('invalid');
	});

	test('Work entity without select parameter should succeed', async () => {
		const url = `${API_BASE}/works/W2009047091`;

		const response = await fetch(url);

		// Should succeed without select parameter
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('display_name');
	});
});
