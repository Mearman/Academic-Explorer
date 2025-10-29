# Routing Known Issues

## External ID URLs with Protocol Slashes

### Issue
External IDs containing `https://` or `ror://` protocols fail when used directly in URL paths due to TanStack Router's path normalization behavior.

### Affected URLs
- ORCID URLs with `https://` prefix: `/authors/https://orcid.org/0000-0002-1298-3089`
- ROR URLs with `https://` prefix: `/institutions/https://ror.org/02y3ad647`
- Any external ID URL with consecutive slashes in protocols

### Root Cause
TanStack Router normalizes consecutive slashes (`//`) in route paths to single slashes (`/`) during routing, even when URL-encoded. This affects:
1. Single encoding (`%2F%2F` → `%2F`)
2. Double encoding (`%252F%252F` → `%252F`)

The router collapses slashes at a level that cannot be intercepted by component-level decoding.

### Working Formats
The following alternative formats work correctly:
- ✅ ORCID with prefix: `/authors/orcid:0000-0002-1298-3089`
- ✅ ROR with prefix: `/institutions/ror:02y3ad647`
- ✅ DOI with prefix: `/works/doi:10.1234/example`
- ✅ OpenAlex IDs: `/works/W123456789`

### Attempted Solutions
1. **URL Encoding** - `encodeURIComponent()` creates `%2F` which gets collapsed
2. **Double Encoding** - `%252F` still gets collapsed during routing
3. **Protocol Slash Fixing** - Post-decode fixes can't run before routing errors occur
4. **Catch-all Routes** - Still receive collapsed slashes from router

### Workarounds Implemented
1. Created `decodeEntityId()` utility that handles:
   - Double-encoded slashes (`%252F` → `%2F`)
   - Single-encoded slashes (`%2F` → `/`)
   - Post-decode slash restoration (`https:/` → `https://`)

2. Applied utility to:
   - All entity route components (authors, works, institutions, etc.)
   - Navigation tracking component
   - Catch-all routes (`$_.tsx`, `$externalId.tsx`)
   - OpenAlex URL routing

3. Modified openalex-url route to:
   - Preserve protocol slashes during path parsing
   - Use double-encoding for navigation (with limitations)

### Current Status
- ✅ Most URL formats working (OpenAlex IDs, prefixed external IDs, filters, searches)
- ⚠️ `https://` URLs in paths fail (but search/filter parameters work)
- ✅ API calls succeed even when rendering fails (cache logs show correct URLs)
- ⚠️ Error boundary shows encoded URL without decoding

### Recommendations
1. **Use prefix formats** for external IDs: `orcid:`, `ror:`, `doi:` instead of full URLs
2. **Query parameters** could be used as alternative: `/authors?id=https://orcid.org/...`
3. **Base64 encoding** would avoid slash issues entirely
4. **Router upgrade** - Check if newer TanStack Router versions fix path normalization

### Related Files
- `/apps/web/src/utils/url-decoding.ts` - Decoding utility
- `/apps/web/src/routes/openalex-url/$.lazy.tsx` - URL routing logic
- `/apps/web/src/routes/authors/$authorId.lazy.tsx` - Example entity route
- `/apps/web/src/components/NavigationTracker.tsx` - Navigation tracking

### Testing
Test file: `/apps/web/src/test/e2e/all-urls-load.e2e.test.ts`

Expected results:
- ORCID/ROR URLs with `https://` will show navigation errors
- Prefixed formats (`orcid:`, `ror:`) work correctly
- List pages, searches, and filters work correctly
- ~250+ of 276 URLs should pass
