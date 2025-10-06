# Disk Cache Writer

A robust disk-based cache writing system for OpenAlex API responses with atomic operations, file locking, and metadata generation.

## Features

- **Atomic Operations**: Uses temporary files and atomic renames to prevent corrupted writes
- **Concurrent Access Control**: File locking mechanism prevents write conflicts
- **Organized Structure**: Files organized by entity type and ID (e.g., `authors/A123.json`)
- **Metadata Files**: Stores request/response headers, timestamps, and cache metadata
- **Error Handling**: Comprehensive error handling for disk space, permissions, and concurrent access
- **Entity Detection**: Automatic detection of OpenAlex entity types and IDs
- **Validation**: Input validation and disk space checks

## Directory Structure

The cache creates the following structure under `apps/web/public/data/openalex/`:

```
apps/web/public/data/openalex/
├── authors/
│   ├── A123456789.json      # Author entity data
│   ├── A123456789.meta.json # Metadata for author
│   └── ...
├── works/
│   ├── W987654321.json      # Work entity data
│   ├── W987654321.meta.json # Metadata for work
│   └── ...
├── sources/
├── institutions/
├── topics/
├── concepts/
├── publishers/
├── funders/
└── keywords/
```

## Usage

### Basic Usage

```typescript
import { writeToDiskCache } from '@academic-explorer/client/cache/disk';

// Write intercepted API response to disk
await writeToDiskCache({
  url: 'https://api.openalex.org/authors/A123456789',
  method: 'GET',
  requestHeaders: { 'Accept': 'application/json' },
  responseData: {
    id: 'https://openalex.org/A123456789',
    display_name: 'John Doe',
    // ... other OpenAlex entity properties
  },
  statusCode: 200,
  responseHeaders: { 'content-type': 'application/json' },
  timestamp: new Date().toISOString(),
});
```

### Advanced Configuration

```typescript
import { DiskCacheWriter } from '@academic-explorer/client/cache/disk';

const writer = new DiskCacheWriter({
  basePath: '/custom/cache/path',
  maxConcurrentWrites: 5,
  lockTimeoutMs: 10000,
  checkDiskSpace: true,
  minDiskSpaceBytes: 500 * 1024 * 1024, // 500MB
});

await writer.writeToCache(interceptedData);
```

## Configuration Options

- **basePath**: Directory where cache files are stored (default: `apps/web/public/data/openalex`)
- **maxConcurrentWrites**: Maximum number of concurrent write operations (default: 10)
- **lockTimeoutMs**: Timeout for file lock acquisition in milliseconds (default: 5000)
- **checkDiskSpace**: Whether to validate available disk space before writing (default: true)
- **minDiskSpaceBytes**: Minimum required disk space in bytes (default: 100MB)

## Metadata Format

Each cached entity includes a metadata file with:

```json
{
  "url": "https://api.openalex.org/authors/A123456789",
  "method": "GET",
  "requestHeaders": { "Accept": "application/json" },
  "statusCode": 200,
  "responseHeaders": { "content-type": "application/json" },
  "timestamp": "2024-09-27T12:00:00.000Z",
  "contentType": "application/json",
  "cacheWriteTime": "2024-09-27T12:00:01.000Z",
  "entityType": "authors",
  "entityId": "A123456789",
  "fileSizeBytes": 1234,
  "contentHash": "sha256_hash_here"
}
```

## Error Handling

The system handles various error conditions:

- **Disk Space**: Checks available space before writing
- **File Permissions**: Handles permission errors gracefully
- **Concurrent Access**: File locking prevents write conflicts
- **Network Issues**: Validates input data structure
- **Filesystem Errors**: Comprehensive error logging and recovery

## Monitoring

Get cache statistics:

```typescript
const stats = writer.getCacheStats();
console.log({
  activeLocks: stats.activeLocks,
  activeWrites: stats.activeWrites,
  maxConcurrentWrites: stats.maxConcurrentWrites,
});
```

## Cleanup

Clean up resources when done:

```typescript
await writer.cleanup();
```

This waits for all active writes to complete and clears all locks.

## Integration Notes

This module is designed to work with request interceptors that capture OpenAlex API responses. It focuses solely on writing data to disk and does not implement request interception or reading logic.

The disk writer automatically:
- Detects entity types from URLs or response data
- Sanitizes filenames for filesystem compatibility
- Creates directory structures as needed
- Generates content hashes for integrity verification
- Manages concurrent access with file locking