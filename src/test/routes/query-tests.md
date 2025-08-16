# Query Route Test Coverage

This document outlines the comprehensive test suite for the query route URL parameter handling functionality.

## Test Files Created

### 1. `query.unit.test.ts` (14 tests)
**Purpose**: Unit tests for the `convertUrlParamsToWorksParams` function

**Coverage**:
- ✅ Empty parameters handling
- ✅ Basic search query conversion
- ✅ Sort parameters with order
- ✅ Default sort order (desc when not specified)
- ✅ Pagination parameters (per_page, page)
- ✅ Boolean filter parameters (is_oa, has_fulltext, has_doi, has_abstract)
- ✅ Retraction filter handling (not_retracted → is_retracted:false)
- ✅ Publication year filter
- ✅ Entity ID filters (author_id, institution_id, source_id, funder_id, topic_id)
- ✅ Date range parameters (from_date, to_date)
- ✅ Additional query parameters (sample, group_by)
- ✅ Complex queries with multiple parameters
- ✅ Undefined/null value handling
- ✅ Boolean false value handling

### 2. `query.component.test.tsx` (12 tests)
**Purpose**: Component tests for query route URL parameter initialization

**Coverage**:
- ✅ Component rendering with all child components
- ✅ Empty searchParams initialization
- ✅ Basic query parameter conversion
- ✅ Sort and order parameter handling
- ✅ Pagination parameter conversion
- ✅ Boolean filter parameter conversion
- ✅ Year filter parameter conversion
- ✅ Entity ID parameter conversion
- ✅ Date range parameter conversion
- ✅ Complex URL parameter combinations
- ✅ URL-encoded special character handling
- ✅ Dynamic parameter updates

### 3. `query.integration.test.tsx` (13 tests)
**Purpose**: Integration tests for full navigation and search flow

**Coverage**:
- ✅ Direct URL navigation with search execution
- ✅ Complex query URL handling
- ✅ Parameter changes triggering new searches
- ✅ Empty query parameter handling
- ✅ URL parameter persistence across re-renders
- ✅ Special character handling in queries
- ✅ Boolean filter parameter search triggering
- ✅ Date range parameter search triggering
- ✅ Entity ID filter parameter search triggering
- ✅ API error handling
- ✅ Loading state display
- ✅ Pagination parameter handling
- ✅ Search history maintenance

### 4. `query-edge-cases.unit.test.ts` (23 tests)
**Purpose**: Edge case and error handling tests

**Coverage**:

#### Input Validation (3 tests)
- ✅ Null and undefined parameter handling
- ✅ Empty string parameter handling
- ✅ Whitespace-only string handling

#### Numeric Edge Cases (3 tests)
- ✅ Zero value handling (falsy values)
- ✅ Negative number handling
- ✅ Very large number handling

#### String Edge Cases (4 tests)
- ✅ Special characters in search queries
- ✅ Unicode character handling
- ✅ Very long string handling
- ✅ Entity ID special format handling

#### Date Edge Cases (3 tests)
- ✅ Various date format handling
- ✅ Invalid date string handling
- ✅ Edge date value handling

#### Boolean Edge Cases (2 tests)
- ✅ Explicit boolean false value handling
- ✅ False vs undefined distinction

#### Sort Parameter Edge Cases (3 tests)
- ✅ Sort without order handling
- ✅ Empty sort parameter handling
- ✅ Special characters in sort field

#### Complex Filter Combinations (3 tests)
- ✅ Complex filter string building
- ✅ Single filter handling
- ✅ No filter handling

#### Memory and Performance Edge Cases (2 tests)
- ✅ Large number of parameters handling
- ✅ Deeply nested object parameter handling

## Test Environment Setup

### Unit Tests
- Environment: jsdom
- Memory optimised execution
- Type: Pure logic testing

### Component Tests
- Environment: jsdom
- Timeout: 30 seconds
- Mocked components for isolation
- React Testing Library integration

### Integration Tests
- Environment: node
- Timeout: 45 seconds
- MSW for API mocking
- Full router integration
- Real HTTP request simulation

## Key Testing Patterns

### 1. Mock Strategy
- **SearchResults Component**: Mocked to capture `searchParams` prop
- **Other Components**: Mocked for test isolation
- **OpenAlex API**: Mocked with MSW for consistent responses

### 2. Parameter Conversion Testing
- **URL → WorksParams**: Comprehensive conversion testing
- **Filter String Building**: Correct filter syntax verification
- **Sort Parameter Handling**: Sort field and order combination
- **Pagination**: Page and per_page parameter handling

### 3. Edge Case Coverage
- **Falsy Values**: Zero, null, undefined, empty string handling
- **Type Coercion**: String to number conversion edge cases
- **Special Characters**: Unicode, symbols, encoded characters
- **Performance**: Large inputs and complex scenarios

## Test Results

All **62 tests** pass successfully:
- ✅ 14 unit tests
- ✅ 12 component tests  
- ✅ 13 integration tests
- ✅ 23 edge case tests

## Key Test Insights

### 1. Function Behaviour Discoveries
- Zero values are treated as falsy in pagination parameters
- Null values get stringified in filter parameters
- Whitespace-only strings are preserved in search queries
- Empty strings in entity IDs are ignored

### 2. Component Integration
- URL parameters are automatically converted to `WorksParams` on mount
- `SearchResults` component receives proper parameter format
- Parameter changes trigger new searches correctly

### 3. Error Resilience
- Invalid parameters are handled gracefully
- API errors don't crash the component
- Loading states are properly displayed
- URL parameter persistence is maintained

## Future Test Considerations

1. **Performance Testing**: Large query result sets
2. **Accessibility Testing**: Screen reader compatibility
3. **Browser Compatibility**: Cross-browser URL handling
4. **Real API Testing**: Actual OpenAlex API integration tests
5. **User Journey Testing**: Full search workflow end-to-end tests