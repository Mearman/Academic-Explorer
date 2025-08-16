# URL Pattern Testing for Academic Explorer

Based on https://docs.openalex.org/how-to-use-the-api/get-single-entities, these URL patterns should work for author A5017898742:

## Expected URL Patterns (should all redirect to /#/authors/A5017898742):

1. `/#/authors/https://openalex.org/A5017898742`
2. `/#/A5017898742`  
3. `/#/https://orcid.org/0000-0003-1613-5981`
4. `/#/authors/https://orcid.org/0000-0003-1613-5981`
5. `/#/authors/0000-0003-1613-5981`

## Current Routing Structure Analysis:

### Route Priority Order (from routeTree.gen.ts):
1. `/authors/$id` - Direct author ID route
2. `/orcid/$id` - ORCID-specific route  
3. `/entity/$` - Generic entity catch-all
4. `/entity/$type/$id` - Typed entity route

### Route Handlers Analysis:

1. **`/authors/$id`** (`authors.$id.tsx`):
   - Handles author-specific IDs
   - Uses `useNumericIdRedirect` for numeric IDs
   - Uses `useAuthorData` hook

2. **`/orcid/$id`** (`orcid.$id.tsx`):
   - Handles ORCID IDs specifically  
   - Validates ORCID format
   - Redirects to `/authors/{orcid}`

3. **`/entity/$`** (`entity.$.tsx`):
   - Generic entity detection and redirection
   - Uses `detectIdType` and `parseExternalId`
   - Handles both OpenAlex IDs and external IDs

4. **`/entity/$type/$id`** (`entity.$type.$id.tsx`):
   - Generic entity display with type specification
   - Maps URL types to EntityType enum

## Issues Identified:

### Problem 1: URL Encoding in Routes
The URL patterns with `https://` URLs need to be properly URL-encoded when used as route parameters.

### Problem 2: Missing Route for Bare OpenAlex IDs
Pattern `/#/A5017898742` doesn't have a direct route - it should go to the generic entity detection.

### Problem 3: Hash Routing vs. HTML5 History
The examples use hash routing (`/#/`) but TanStack Router may be using HTML5 history mode.

## Testing Plan:

1. Test direct OpenAlex ID: `/A5017898742`
2. Test full OpenAlex URL: `/authors/https%3A%2F%2Fopenalex.org%2FA5017898742`
3. Test ORCID ID: `/orcid/0000-0003-1613-5981`
4. Test ORCID URL: `/authors/https%3A%2F%2Forcid.org%2F0000-0003-1613-5981`
5. Test bare ORCID: `/authors/0000-0003-1613-5981`