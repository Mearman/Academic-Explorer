/**
 * Test file to verify the advanced field selection types work correctly
 * This file will help us validate that the utility types are working as expected
 */

import type { WorkSelectableFields, AuthorSelectableFields } from './advanced-field-selection';
import { createAdvancedFieldSelection, ADVANCED_FIELD_SELECTIONS } from './advanced-field-selection';

// ✅ Test valid Work fields that should compile
const testWorkFields: WorkSelectableFields[] = [
  'id',
  'display_name',
  'authorships', // Full object only
  'primary_location', // Full object only
  'primary_location.source.id', // Valid nested path
  'primary_location.source.display_name', // Valid nested path
  'referenced_works',
  'publication_year',
  'type',
  'open_access.is_oa', // Valid nested path
  'cited_by_count'
];

// ✅ Test valid Author fields that should compile
const testAuthorFields: AuthorSelectableFields[] = [
  'id',
  'display_name',
  'affiliations', // Full object only
  'affiliations.institution.id', // Valid nested path
  'affiliations.institution.display_name', // Valid nested path
  'works_count',
  'cited_by_count',
  'orcid'
];

// ❌ These should cause TypeScript errors when uncommented
// const invalidWorkFields: WorkSelectableFields[] = [
//   'invalid_field',                    // Not a real field
//   'authorships.author.id',           // Not supported by OpenAlex API
//   'authorships.author.display_name', // Not supported by OpenAlex API
//   'authorships.institutions.id',     // Not supported by OpenAlex API
//   'concepts.level'                   // Not supported nested path
// ];

// ❌ These should cause TypeScript errors when uncommented
// const invalidAuthorFields: AuthorSelectableFields[] = [
//   'invalid_field',                   // Not a real field
//   'affiliations.institution.ror',   // May not be supported nested path
//   'works.title'                      // Not a valid nested path
// ];

// ✅ Test the createAdvancedFieldSelection function with valid selections
const workSelection = createAdvancedFieldSelection('works', [
  'id',
  'display_name',
  'primary_location.source.id', // Valid nested path
  'open_access.is_oa',          // Valid nested path
  'referenced_works'
]);

const authorSelection = createAdvancedFieldSelection('authors', [
  'id',
  'display_name',
  'affiliations.institution.id' // Valid nested path
]);

// Test what types are actually being generated
type TestWorkFields = WorkSelectableFields;

// Test that invalid fields are caught
const testInvalidField: WorkSelectableFields = 'definitely_invalid_field_name';
const testInvalidNestedField: WorkSelectableFields = 'authorships.author.id';

// Test predefined selections
const minimalWorkFields = ADVANCED_FIELD_SELECTIONS.works.minimal;
const basicAuthorFields = ADVANCED_FIELD_SELECTIONS.authors.basic;

// Export for verification (this ensures the types compile correctly)
export {
  testWorkFields,
  testAuthorFields,
  workSelection,
  authorSelection,
  minimalWorkFields,
  basicAuthorFields
};