/**
 * Debug file to test automatic type inference
 */

import type { Work } from './types';
import type { WorkSelectableFields } from './advanced-field-selection';

// Test the actual types generated
type DebugWorkFields = WorkSelectableFields;

// Test automatic inference - these should work
const validTopLevel: WorkSelectableFields = 'id';
const validNested: WorkSelectableFields = 'open_access.is_oa';

// Test that invalid patterns are filtered out
const shouldFail1: WorkSelectableFields = 'authorships.author.id'; // Should be filtered out
const shouldFail2: WorkSelectableFields = 'completely_fake_field';

// Export for inspection
export type { DebugWorkFields };