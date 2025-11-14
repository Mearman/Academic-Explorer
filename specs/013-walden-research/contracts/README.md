# API Contracts: OpenAlex Walden Support

**Note**: This feature integrates with external OpenAlex API only. No new Academic Explorer endpoints.

## OpenAlex API Integration

### Parameters

**data-version** (query parameter)
- Type: `'1'`  
- Optional: Yes (omit for v2 default)
- Purpose: Temporary v1 access (deprecated Dec 2025)

**include_xpac** (query parameter)
- Type: `boolean`
- Optional: Yes (omit for false default)
- Purpose: Include 190M non-traditional works

### Response Schema Changes

All v2 responses include:
```json
{
  "is_xpac": false
}
```

No breaking changes to existing fields.
