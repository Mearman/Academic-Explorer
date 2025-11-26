# Route Coverage Report

**Generated**: 2025-11-26T19:40:28.633Z
**Total Routes**: 47
**Covered Routes**: 46
**Coverage**: 98%

## Summary by Category

| Category | Total | Covered | Coverage |
|----------|-------|---------|----------|
| entityIndex | 12 | 12 | ✅ 100% |
| entityDetail | 12 | 12 | ✅ 100% |
| utility | 11 | 11 | ✅ 100% |
| special | 7 | 7 | ✅ 100% |
| error | 5 | 4 | 🟡 80% |

## Detailed Coverage


### entityIndex

- ✅ `/works` (63 tests)
- ✅ `/authors` (52 tests)
- ✅ `/institutions` (35 tests)
- ✅ `/sources` (26 tests)
- ✅ `/topics` (15 tests)
- ✅ `/funders` (9 tests)
- ✅ `/publishers` (8 tests)
- ✅ `/concepts` (10 tests)
- ✅ `/keywords` (5 tests)
- ✅ `/domains` (1 test)
- ✅ `/fields` (3 tests)
- ✅ `/subfields` (1 test)

### entityDetail

- ✅ `/works/:id` (64 tests)
- ✅ `/authors/:id` (2 tests)
- ✅ `/institutions/:id` (64 tests)
- ✅ `/sources/:id` (27 tests)
- ✅ `/topics/:id` (15 tests)
- ✅ `/funders/:id` (9 tests)
- ✅ `/publishers/:id` (8 tests)
- ✅ `/concepts/:id` (10 tests)
- ✅ `/keywords/:id` (5 tests)
- ✅ `/domains/:id` (1 test)
- ✅ `/fields/:id` (3 tests)
- ✅ `/subfields/:id` (1 test)

### utility

- ✅ `/` (3 tests)
- ✅ `/browse` (18 tests)
- ✅ `/search` (41 tests)
- ✅ `/explore` (19 tests)
- ✅ `/settings` (6 tests)
- ✅ `/about` (8 tests)
- ✅ `/cache` (11 tests)
- ✅ `/history` (4 tests)
- ✅ `/bookmarks` (16 tests)
- ✅ `/catalogue` (10 tests)
- ✅ `/autocomplete` (6 tests)

### special

- ✅ `/openalex-url/*` (11 tests)
- ✅ `/doi/:doi` (4 tests)
- ✅ `/orcid/:orcid` (9 tests)
- ✅ `/ror/:ror` (60 tests)
- ✅ `/issn/:issn` (7 tests)
- ✅ `/https/*` (19 tests)
- ✅ `/:externalId` (8 tests)

### error

- ❌ `/error-test`
- ✅ `404` (1 test)
- ✅ `500` (1 test)
- ✅ `network-error` (1 test)
- ✅ `timeout` (1 test)

## Uncovered Routes

- `/error-test` (error)
