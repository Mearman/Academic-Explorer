# Generated OpenAlex API Tests

This directory contains automatically generated comprehensive tests for all OpenAlex API routes.

## Files Generated

- `all-routes.unit.test.ts` - Unit tests with mocked dependencies (276 test cases)
- `all-routes.integration.test.ts` - Integration tests with real API calls (selective)
- `test-config.ts` - Configuration and utilities for generated tests

## Coverage Statistics

- **Total routes tested**: 276
- **Entities covered**: 10 (works, authors, concepts, funders, institutions, publishers, sources, keywords, text, topics)
- **Operation types**: 7 (get, list, filter, search, autocomplete, group, text-analysis)
- **Routes with external ID support**: 7
- **Routes with filter support**: 124
- **Routes with search support**: 20

## Running Tests

```bash
# Run unit tests
pnpm test generated-tests/all-routes.unit.test.ts

# Run integration tests (requires internet and rate limiting)
RUN_INTEGRATION_TESTS=true OPENALEX_EMAIL=your@email.com pnpm test generated-tests/all-routes.integration.test.ts

# Run all generated tests
pnpm test generated-tests/
```

## Notes

- Unit tests use mocked HTTP client and can run offline
- Integration tests make real API calls and should be run sparingly
- Tests are automatically generated from OpenAlex documentation
- Some test cases may show warnings for API methods not yet implemented

Generated on: 2025-10-20T05:05:16.310Z
