/**
 * Comprehensive OpenAlex Data Management Plugin
 * - Downloads missing entity files when entities exist in index but files are missing
 * - Executes missing queries when query definitions exist but result files are missing
 * - Populates missing metadata in both entity and query index files
 * - Generates and maintains complete index files for all entity types
 * - Always runs at build time to ensure complete data availability
 */
import { readFile, writeFile, readdir, stat, access, mkdir, unlink } from 'fs/promises';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import type { Plugin } from 'vite';

// Import existing OpenAlex utilities
import { downloadEntityFromOpenAlex } from '../lib/utils/openalex-downloader';
import { fetchOpenAlexQuery, saveQueryToCache } from '../lib/utils/query-cache-builder';

// Import additional utilities for direct filename control

// Unified Index Structure
interface IndexEntry {
  lastModified?: string;
  contentHash?: string;
}

// Unified index: keys can be queries, entities, or URLs in various formats
interface UnifiedIndex {
  [key: string]: IndexEntry;
}

// Index file format with requests wrapper
interface IndexFile {
  requests: Record<string, { $ref: string; lastModified: string; contentHash: string }>;
}

const ENTITY_TYPES = ['works', 'authors', 'institutions', 'topics', 'sources', 'publishers', 'funders', 'concepts', 'autocomplete'];

/**
 * Get the OpenAlex ID prefix for a given entity type
 */
function getEntityPrefix(entityType: string): string {
  const prefixMap: Record<string, string> = {
    'works': 'W',
    'authors': 'A',
    'institutions': 'I',
    'topics': 'T',
    'sources': 'S',
    'publishers': 'P',
    'funders': 'F',
    'concepts': 'C',
    'autocomplete': '' // Autocomplete doesn't use entity prefixes, only queries
  };
  return prefixMap[entityType] || '';
}

/**
 * Parse a unified index key to determine what type of resource it represents
 */
interface ParsedKey {
  type: 'entity' | 'query';
  entityType: string;
  entityId?: string;
  queryParams?: Record<string, unknown>;
  originalKey: string;
  canonicalUrl: string;
}

/**
 * Parse various key formats into a standardized structure
 */
function parseIndexKey(key: string): ParsedKey | null {
  // Handle full OpenAlex URLs
  if (key.startsWith('https://api.openalex.org/')) {
    return parseOpenAlexApiUrl(key);
  }

  if (key.startsWith('https://openalex.org/')) {
    return parseOpenAlexUrl(key);
  }

  // Handle relative paths and entity IDs
  if (key.includes('?')) {
    // Query format like "works?per_page=30&page=1" or "autocomplete?q=foo"
    return parseRelativeQuery(key);
  }

  if (key.includes('/')) {
    // Entity path format like "works/W2241997964"
    return parseEntityPath(key);
  }

  // Direct entity ID like "W1234"
  return parseDirectEntityId(key);
}

function parseOpenAlexApiUrl(url: string): ParsedKey | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    if (pathParts.length === 1) {
      // Query: https://api.openalex.org/works?per_page=30&page=1
      const entityType = pathParts[0];
      const queryParams: Record<string, unknown> = {};

      for (const [key, value] of urlObj.searchParams.entries()) {
        queryParams[key] = value;
      }

      return {
        type: 'query',
        entityType,
        queryParams,
        originalKey: url,
        canonicalUrl: url
      };
    } else if (pathParts.length === 2) {
      // Entity: https://api.openalex.org/works/W2241997964
      const entityType = pathParts[0];
      const entityId = pathParts[1];

      const queryParams: Record<string, unknown> = {};
      for (const [key, value] of urlObj.searchParams.entries()) {
        queryParams[key] = value;
      }

      if (Object.keys(queryParams).length > 0) {
        // Entity with query params
        return {
          type: 'query',
          entityType,
          entityId,
          queryParams,
          originalKey: url,
          canonicalUrl: url
        };
      } else {
        // Pure entity
        return {
          type: 'entity',
          entityType,
          entityId,
          originalKey: url,
          canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`
        };
      }
    }
  } catch (error) {
    return null;
  }
  return null;
}

function parseOpenAlexUrl(url: string): ParsedKey | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    if (pathParts.length === 1) {
      // Direct entity: https://openalex.org/W2241997964
      const entityId = pathParts[0];
      const entityType = inferEntityTypeFromId(entityId);

      return {
        type: 'entity',
        entityType,
        entityId,
        originalKey: url,
        canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`
      };
    } else if (pathParts.length === 2) {
      // Entity with type: https://openalex.org/works/W2241997964
      const entityType = pathParts[0];
      const entityId = pathParts[1];

      return {
        type: 'entity',
        entityType,
        entityId,
        originalKey: url,
        canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`
      };
    }
  } catch (error) {
    return null;
  }
  return null;
}

function parseRelativeQuery(key: string): ParsedKey | null {
  const [path, queryString] = key.split('?');

  try {
    const queryParams: Record<string, unknown> = {};
    const searchParams = new URLSearchParams(queryString);

    for (const [paramKey, value] of searchParams.entries()) {
      queryParams[paramKey] = value;
    }

    return {
      type: 'query',
      entityType: path,
      queryParams,
      originalKey: key,
      canonicalUrl: `https://api.openalex.org/${path}?${queryString}`
    };
  } catch (error) {
    return null;
  }
}

function parseEntityPath(key: string): ParsedKey | null {
  const parts = key.split('/');
  if (parts.length === 2) {
    const [entityType, entityId] = parts;

    return {
      type: 'entity',
      entityType,
      entityId,
      originalKey: key,
      canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`
    };
  }
  return null;
}

function parseDirectEntityId(key: string): ParsedKey | null {
  const entityType = inferEntityTypeFromId(key);

  return {
    type: 'entity',
    entityType,
    entityId: key,
    originalKey: key,
    canonicalUrl: `https://api.openalex.org/${entityType}/${key}`
  };
}

/**
 * Infer entity type from OpenAlex ID prefix
 */
function inferEntityTypeFromId(id: string): string {
  if (id.startsWith('W')) return 'works';
  if (id.startsWith('A')) return 'authors';
  if (id.startsWith('I')) return 'institutions';
  if (id.startsWith('T')) return 'topics';
  if (id.startsWith('S')) return 'sources';
  if (id.startsWith('P')) return 'publishers';
  if (id.startsWith('F')) return 'funders';
  if (id.startsWith('C')) return 'concepts';

  // Default fallback
  return 'works';
}

/**
 * Download entity directly with encoded filename (avoids temporary file creation)
 */
async function downloadEntityWithEncodedFilename(
  entityType: string,
  entityId: string,
  targetFilePath: string
): Promise<boolean> {
  try {
    // Entity type mapping (same as in openalex-downloader)
    const ENTITY_TYPE_TO_ENDPOINT: Record<string, string> = {
      "authors": "authors",
      "works": "works",
      "institutions": "institutions",
      "topics": "topics",
      "publishers": "publishers",
      "funders": "funders",
      "sources": "sources",
      "concepts": "concepts"
    };

    const endpoint = ENTITY_TYPE_TO_ENDPOINT[entityType];
    if (!endpoint) {
      console.error(`❌ Unknown entity type: ${entityType}`);
      return false;
    }

    // Construct API URL using same config as openalex-downloader
    const apiUrl = `https://api.openalex.org/${endpoint}/${entityId}`;

    console.log(`🔄 Downloading ${entityType}/${entityId} from OpenAlex...`);

    // Simple fetch with error handling
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`❌ Failed to download ${entityType}/${entityId}: ${response.status} ${response.statusText}`);
      return false;
    }

    const rawJsonText = await response.text();
    if (!rawJsonText) {
      console.error(`❌ Failed to download ${entityType}/${entityId}: empty response`);
      return false;
    }

    // Parse and re-stringify for consistent formatting
    const parsedData = JSON.parse(rawJsonText);
    const prettyJson = JSON.stringify(parsedData, null, 2);

    // Save directly to target path with encoded filename
    await writeFile(targetFilePath, prettyJson);

    console.log(`✅ Downloaded and saved ${entityType}/${entityId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error downloading ${entityType}/${entityId}:`, error);
    return false;
  }
}

export function openalexDataPlugin(): Plugin {
  return {
    name: 'openalex-data-management',
    buildStart: {
      order: 'pre',
      async handler() {
        console.log('🔄 Starting comprehensive OpenAlex data management...');

        const dataPath = 'public/data/openalex';

        for (const entityType of ENTITY_TYPES) {
          try {
            console.log(`\n📁 Processing ${entityType}...`);

            // 1. Load or create unified index
            const index = await loadUnifiedIndex(dataPath, entityType);

            // 2. Seed missing data based on index entries
            await seedMissingData(dataPath, entityType, index);

            // 3. Reformat existing files for consistency
            await reformatExistingFiles(dataPath, entityType);

            // 4. Migrate query files from queries subdirectory to entity directory
            await migrateQueryFilesToEntityDirectory(dataPath, entityType);

            // 5. Scan and update unified index with both entities and queries
            const unifiedIndex = await updateUnifiedIndex(dataPath, entityType, index);

            // 6. Save unified index
            await saveUnifiedIndex(dataPath, entityType, unifiedIndex);

          } catch (error) {
            console.log(`  ❌ Error processing ${entityType}:`, error);
          }
        }

        // Generate main index with JSON $ref structure
        try {
          console.log('\n📝 Generating main index with JSON $ref structure...');
          await generateMainIndex(dataPath);
        } catch (error) {
          console.log('❌ Error generating main index:', error);
        }

        console.log('\n✅ OpenAlex data management completed');
      }
    }
  };
}

/**
 * Load unified index for an entity type
 */
async function loadUnifiedIndex(dataPath: string, entityType: string): Promise<UnifiedIndex> {
  const indexPath = join(dataPath, entityType, 'index.json');

  try {
    const indexContent = await readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(indexContent);

    // Check if it's already in the new format with requests wrapper
    if (parsed && typeof parsed === 'object' && parsed.requests) {
      // Clean and normalize existing unified format from requests
      const cleaned: UnifiedIndex = {};
      for (const [key, entry] of Object.entries(parsed.requests)) {
        if (entry && typeof entry === 'object') {
          // Parse the key and get its canonical form
          const parsedKey = parseIndexKey(key);
          if (parsedKey && parsedKey.type === 'entity') {
            // Only include entity entries in the entity index
            // Normalize the canonical URL to decoded form
            const canonicalKey = normalizeUrlForDeduplication(parsedKey.canonicalUrl);
            const cleanEntry: IndexEntry = {
              lastModified: (entry as any).lastModified,
              contentHash: (entry as any).contentHash
            };

            // Merge with existing entry if duplicate canonical keys exist
            if (cleaned[canonicalKey]) {
              // Keep the most recent lastModified
              if (cleanEntry.lastModified && (!cleaned[canonicalKey].lastModified ||
                  cleanEntry.lastModified > cleaned[canonicalKey].lastModified)) {
                cleaned[canonicalKey] = cleanEntry;
              }
            } else {
              cleaned[canonicalKey] = cleanEntry;
            }
          }
          // Skip query entries - they will be handled by the separate query index
        }
      }
      return cleaned;
    }

    // Check if it's the old flat format (direct keys without requests wrapper)
    if (typeof parsed === 'object' && !parsed.entityType && !parsed.entities) {
      console.log(`  🔄 Converting flat index format to requests wrapper format`);
      // Clean and normalize existing unified format from flat structure
      const cleaned: UnifiedIndex = {};
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry && typeof entry === 'object') {
          // Parse the key and get its canonical form
          const parsedKey = parseIndexKey(key);
          if (parsedKey) {
            // Normalize the canonical URL to decoded form
            const canonicalKey = normalizeUrlForDeduplication(parsedKey.canonicalUrl);
            const cleanEntry: IndexEntry = {
              lastModified: (entry as any).lastModified,
              contentHash: (entry as any).contentHash
            };

            // Merge with existing entry if duplicate canonical keys exist
            if (cleaned[canonicalKey]) {
              // Keep the most recent lastModified
              if (cleanEntry.lastModified && (!cleaned[canonicalKey].lastModified ||
                  cleanEntry.lastModified > cleaned[canonicalKey].lastModified)) {
                cleaned[canonicalKey] = cleanEntry;
              }
            } else {
              cleaned[canonicalKey] = cleanEntry;
            }
          }
        }
      }
      return cleaned;
    }

    // Convert from old format if needed
    console.log(`  🔄 Converting old index format to unified format`);
    return convertOldIndexToUnified(parsed);
  } catch (error) {
    console.log(`  📝 Creating new unified index`);
    return {};
  }
}

/**
 * Convert old index formats to unified format
 */
function convertOldIndexToUnified(oldIndex: any): UnifiedIndex {
  const unified: UnifiedIndex = {};

  // Handle old entity index format
  if (oldIndex.entities && Array.isArray(oldIndex.entities)) {
    for (const entityId of oldIndex.entities) {
      // Ensure entityId has proper OpenAlex prefix
      const prefix = getEntityPrefix(oldIndex.entityType);
      const fullEntityId = entityId.startsWith(prefix) ? entityId : prefix + entityId;

      // Create canonical URL entry
      const canonicalKey = `https://api.openalex.org/${oldIndex.entityType}/${fullEntityId}`;
      unified[canonicalKey] = {};
    }
  }

  // Handle old query index format
  if (oldIndex.queries) {
    if (Array.isArray(oldIndex.queries)) {
      // New flexible query format
      for (const queryEntry of oldIndex.queries) {
        if (queryEntry.query) {
          const canonicalKey = generateCanonicalQueryKey(queryEntry.query, oldIndex.entityType || 'works');
          if (canonicalKey) {
            unified[canonicalKey] = {
              lastModified: queryEntry.lastModified,
              contentHash: queryEntry.contentHash
            };
          }
        }
      }
    } else {
      // Old object-based query format
      for (const [filename, entry] of Object.entries(oldIndex.queries)) {
        if (entry && typeof entry === 'object') {
          // Generate canonical key from the old entry
          const canonicalKey = generateCanonicalQueryKeyFromEntry(entry as any, oldIndex.entityType || 'works');
          if (canonicalKey) {
            // Strip fileSize from legacy entries
            const cleanEntry: IndexEntry = {
              lastModified: (entry as any).lastModified,
              contentHash: (entry as any).contentHash
            };
            unified[canonicalKey] = cleanEntry;
          }
        }
      }
    }
  }

  return unified;
}

/**
 * Generate canonical query key from a query definition
 */
function generateCanonicalQueryKey(query: any, entityType: string): string | null {
  if (query.params) {
    // Generate canonical query URL
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query.params)) {
      if (Array.isArray(value)) {
        searchParams.set(key, (value as string[]).join(','));
      } else {
        searchParams.set(key, String(value));
      }
    }
    return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
  }

  if (query.url && query.url.startsWith('https://api.openalex.org/')) {
    return query.url;
  }

  return null;
}

/**
 * Generate canonical query key from old entry format
 */
function generateCanonicalQueryKeyFromEntry(entry: any, entityType: string): string | null {
  if (entry.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(entry.params)) {
      if (Array.isArray(value)) {
        searchParams.set(key, (value as string[]).join(','));
      } else {
        searchParams.set(key, String(value));
      }
    }
    return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
  }

  if (entry.url && entry.url.startsWith('https://api.openalex.org/')) {
    return entry.url;
  }

  return null;
}

/**
 * Seed missing data based on unified index entries
 */
async function seedMissingData(dataPath: string, entityType: string, index: UnifiedIndex) {
  let downloadedEntities = 0;
  let executedQueries = 0;

  for (const [key, entry] of Object.entries(index)) {
    const parsed = parseIndexKey(key);
    if (!parsed) continue;

    // Only process entries that belong to this entity type
    if (parsed.entityType !== entityType) continue;

    if (parsed.type === 'entity') {
      // Check if entity file exists using encoded filename format
      const encodedFilename = urlToEncodedKey(parsed.canonicalUrl) + '.json';
      const entityFilePath = join(dataPath, entityType, encodedFilename);

      try {
        await access(entityFilePath);
      } catch (error) {
        // File doesn't exist - download it
        try {
          console.log(`  📥 Downloading ${entityType}/${parsed.entityId}...`);
          await mkdir(join(dataPath, entityType), { recursive: true });
          const success = await downloadEntityWithEncodedFilename(entityType, parsed.entityId!, entityFilePath);

          if (success) {
            console.log(`  ✅ Downloaded ${encodedFilename}`);
            downloadedEntities++;
          } else {
            console.log(`  ❌ Failed to download ${parsed.entityId} (no data returned)`);
          }
        } catch (downloadError) {
          console.log(`  ❌ Error downloading ${parsed.entityId}:`, downloadError instanceof Error ? downloadError.message : String(downloadError));
        }
      }

    } else if (parsed.type === 'query') {
      // Check if query result file exists in the entity directory
      const filename = await generateFilenameFromParsedKey(parsed);
      if (!filename) continue;

      const queryFilePath = join(dataPath, entityType, filename);

      try {
        await access(queryFilePath);
      } catch (error) {
        // File doesn't exist - execute query
        try {
          console.log(`  📥 Executing query: ${key}...`);

          const queryUrl = parsed.canonicalUrl;
          const queryResult = await fetchOpenAlexQuery(queryUrl);

          if (queryResult) {
            const entityDir = join(dataPath, entityType);
            await mkdir(entityDir, { recursive: true });
            // Write the query result directly to entity directory
            await writeFile(join(entityDir, filename), JSON.stringify(queryResult, null, 2));
            console.log(`  ✅ Executed and cached query: ${filename}`);
            executedQueries++;
          } else {
            console.log(`  ❌ Failed to execute query for ${key} (no data returned)`);
          }
        } catch (queryError) {
          console.log(`  ❌ Error executing query for ${key}:`, queryError instanceof Error ? queryError.message : String(queryError));
        }
      }
    }
  }

  if (downloadedEntities > 0 || executedQueries > 0) {
    console.log(`  📥 Downloaded ${downloadedEntities} entities, executed ${executedQueries} queries`);
  } else {
    console.log(`  ✅ All referenced data files present`);
  }
}

/**
 * Ensure consistent JSON formatting for all files
 */
function formatJsonConsistently(jsonContent: string): string {
  try {
    const parsed = JSON.parse(jsonContent);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // If parsing fails, return original content
    console.log(`  ⚠️  Could not parse JSON for formatting:`, error);
    return jsonContent;
  }
}

/**
 * Reformat existing JSON files for consistency
 */
async function reformatExistingFiles(dataPath: string, entityType: string): Promise<void> {
  const entityDir = join(dataPath, entityType);

  try {
    const files = await readdir(entityDir);
    let reformattedCount = 0;

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'index.json') {
        const filePath = join(entityDir, file);

        try {
          const originalContent = await readFile(filePath, 'utf-8');
          const formattedContent = formatJsonConsistently(originalContent);

          // Only write if content changed
          if (originalContent !== formattedContent) {
            await writeFile(filePath, formattedContent);
            reformattedCount++;
          }
        } catch (error) {
          console.log(`  ⚠️  Could not reformat ${file}:`, error);
        }
      }
    }

    if (reformattedCount > 0) {
      console.log(`  🎨 Reformatted ${reformattedCount} files for consistent formatting`);
    }
  } catch (error) {
    // Directory doesn't exist or other error - skip silently
  }
}

/**
 * Convert a canonical URL to the encoded key format for consistent indexing
 * Uses standard URL encoding for safe filename generation
 */
function urlToEncodedKey(url: string): string {
  return encodeURIComponent(url)
    .replace(/\./g, '%2E')  // Ensure dots are encoded for safety
    .replace(/!/g, '%21')   // Encode exclamation marks
    .replace(/'/g, '%27')   // Encode single quotes
    .replace(/\(/g, '%28') // Encode parentheses
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A'); // Encode asterisks
}

/**
 * Generate filename from parsed key using URL encoding
 */
async function generateFilenameFromParsedKey(parsed: ParsedKey): Promise<string | null> {
  // Always use full URL encoding for both entities and queries
  const canonicalUrl = parsed.canonicalUrl;
  if (!canonicalUrl) return null;

  // Apply standard URL encoding for filename safety
  let filename = urlToEncodedKey(canonicalUrl);

  // Add .json extension
  filename = `${filename}.json`;

  return filename;
}

/**
 * Update unified index with both entity and query file metadata
 */
async function updateUnifiedIndex(dataPath: string, entityType: string, index: UnifiedIndex): Promise<UnifiedIndex> {
  // Scan entity files
  const entityDir = join(dataPath, entityType);
  try {
    const entityFiles = await readdir(entityDir);
    for (const file of entityFiles) {
      if (file.endsWith('.json') && file !== 'index.json') {
        const entityId = file.replace('.json', '');
        const filePath = join(entityDir, file);

        try {
          const fileStat = await stat(filePath);
          const fileContent = await readFile(filePath, 'utf-8');
          const contentHash = createContentHash(fileContent);

          // Determine file type based on content structure only
          let fileType: 'entity' | 'query' = 'entity';

          try {
            const parsed = JSON.parse(fileContent);
            if (Array.isArray(parsed)) {
              // Query results as direct array
              fileType = 'query';
            } else if (parsed && typeof parsed === 'object' && 'results' in parsed && Array.isArray(parsed.results)) {
              // Query results wrapped in object with results property
              fileType = 'query';
            }
          } catch (error) {
            // If we can't parse, assume it's an entity file
          }

          const metadata: IndexEntry = {
            lastModified: fileStat.mtime.toISOString(),
            contentHash
          };

          if (fileType === 'entity') {
            // This is an entity file
            let canonicalUrl: string;

            // Try URL decoding for new format
            try {
              const decodedUrl = decodeURIComponent(entityId);
              if (decodedUrl.startsWith('https://')) {
                canonicalUrl = decodedUrl;
              } else {
                throw new Error('Not a URL-encoded format');
              }
            } catch {
              // Handle legacy custom encoding for backward compatibility
              if (entityId.startsWith('https-:')) {
                // This is an encoded filename - decode it carefully
                // Remove the encoded protocol prefix
                let withoutProtocol = entityId.substring(7); // Remove 'https-:'

                // Replace colons with slashes in the path part (no query params for entities)
                withoutProtocol = withoutProtocol.replace(/:/g, '/');

                // Replace hyphens with equals signs
                withoutProtocol = withoutProtocol.replace(/-/g, '=');

                // Reconstruct the full URL
                canonicalUrl = 'https://' + withoutProtocol;
                canonicalUrl = canonicalUrl.replace(/%22/g, '"');
              } else {
                // This is a simple entity ID - construct the canonical URL
                const prefix = getEntityPrefix(entityType);
                const fullEntityId = entityId.startsWith(prefix) ? entityId : prefix + entityId;
                canonicalUrl = `https://api.openalex.org/${entityType}/${fullEntityId}`;
              }
            }
            // Use canonical URL as index key

            if (!index[canonicalUrl]) {
              index[canonicalUrl] = {};
            }
            Object.assign(index[canonicalUrl], metadata);
          } else if (fileType === 'query') {
            // This is a query file
            const canonicalQueryUrl = await determineCanonicalQueryUrl(entityType, entityId, fileContent);
            if (canonicalQueryUrl) {
              // Use canonical URL as index key

              // Check for duplicates with same content hash
              let isDuplicate = false;
              for (const [existingKey, existingEntry] of Object.entries(index)) {
                if (existingEntry.contentHash === contentHash) {
                  isDuplicate = true;
                  console.log(`  🧹 Skipping duplicate query: ${canonicalQueryUrl} (matches ${existingKey})`);
                  break;
                }
              }

              if (!isDuplicate) {
                if (!index[canonicalQueryUrl]) {
                  index[canonicalQueryUrl] = {};
                }
                Object.assign(index[canonicalQueryUrl], metadata);
                console.log(`  📝 Added query to index: ${canonicalQueryUrl}`);
              }
            } else {
              console.log(`  ⚠️  Could not determine canonical URL for query file: ${file}`);
            }
          }

        } catch (error) {
          console.log(`  ⚠️  Error reading ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.log(`  ⏭️  No entity directory found`);
  }

  // Deduplicate entries that may have both prefixed and non-prefixed versions
  deduplicateIndexEntries(index, entityType);

  console.log(`  📝 Updated unified index with entities and queries (${Object.keys(index).length} entries)`);
  return index;
}


/**
 * Determine the canonical query URL for a query file
 * This tries multiple approaches to decode the filename and reconstruct the original query
 */
async function determineCanonicalQueryUrl(entityType: string, filename: string, fileContent: string): Promise<string | null> {
  // Try multiple decoding approaches

  // Approach 1: Try standard URL decoding
  try {
    const cleanFilename = filename.replace(/\.json$/, '');
    const decodedUrl = decodeURIComponent(cleanFilename);

    if (decodedUrl.startsWith('https://api.openalex.org/')) {
      console.log(`  ✅ Decoded URL: ${decodedUrl}`);
      return decodedUrl;
    }
  } catch (error) {
    console.log(`    ❌ Failed URL decoding: ${error}`);
  }

  // Approach 2: Try legacy custom encoding for backward compatibility
  try {
    if (filename.startsWith('https-:')) {
      // Decode: https-::api.openalex.org:autocomplete?q="..." → https://api.openalex.org/autocomplete?q="..."
      console.log(`  🔄 Decoding legacy custom URL encoding: ${filename}`);
      let withoutProtocol = filename.substring(7); // Remove 'https-:'
      withoutProtocol = withoutProtocol
        .replace(/:/g, '/')     // : → /
        .replace(/-/g, '=')     // - → =
        .replace(/%22/g, '"');  // %22 → "
      const decodedUrl = `https://${withoutProtocol}`;
      console.log(`    ✅ Legacy decoded to: ${decodedUrl}`);
      return decodedUrl;
    }
  } catch (error) {
    console.log(`    ❌ Failed to decode legacy custom URL encoding: ${error}`);
  }

  // Approach 2: Try base64url decoding (old format)
  try {
    const decoded = Buffer.from(filename, 'base64url').toString('utf-8');
    const params = JSON.parse(decoded);
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          searchParams.set(key, (value as string[]).join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
      return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
    }
  } catch (error) {
    // Continue to next approach
  }

  // Approach 3: Try hex decoding
  try {
    if (/^[0-9a-f]+$/i.test(filename)) {
      const decoded = Buffer.from(filename, 'hex').toString('utf-8');
      const params = JSON.parse(decoded);
      if (params && typeof params === 'object') {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            searchParams.set(key, (value as string[]).join(','));
          } else {
            searchParams.set(key, String(value));
          }
        }
        return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
      }
    }
  } catch (error) {
    // Continue to next approach
  }

  // Approach 4: Check if the query result contains the original URL
  try {
    const queryResult = JSON.parse(fileContent);
    if (queryResult && queryResult.meta && queryResult.meta.request_url) {
      return queryResult.meta.request_url;
    }
  } catch (error) {
    // Continue to next approach
  }

  // Approach 5: Try to reverse-engineer from query results
  try {
    const queryResult = JSON.parse(fileContent);
    if (queryResult && queryResult.results && Array.isArray(queryResult.results)) {
      const reconstructedUrl = reverseEngineerQueryUrl(entityType, queryResult, filename);
      if (reconstructedUrl) {
        return reconstructedUrl;
      }
    }
  } catch (error) {
    // Continue to next approach
  }

  // Approach 6: Fallback - decode filename to reconstruct URL
  console.log(`  ⚠️  Using filename-based URL reconstruction for: ${filename}`);
  try {
    // Try to decode the filename as URL-encoded
    const cleanFilename = filename.replace(/\.json$/, '');
    const decodedUrl = decodeURIComponent(cleanFilename);

    // Validate it's a proper OpenAlex URL
    if (decodedUrl.startsWith('https://api.openalex.org/')) {
      return decodedUrl;
    }
  } catch (error) {
    console.log(`    ❌ Failed to decode filename: ${error}`);
  }

  // Ultimate fallback - this shouldn't happen with proper encoding
  console.log(`    ⚠️  Cannot reconstruct URL from filename: ${filename}`);
  return null;
}

/**
 * Try to reverse-engineer the original query URL from the results
 */
function reverseEngineerQueryUrl(entityType: string, queryResult: any, filename: string): string | null {
  const results = queryResult.results;
  if (!results || results.length === 0) return null;

  // Check what fields are present in the first result
  const firstResult = results[0];
  const fields = Object.keys(firstResult);

  // Common patterns to detect:

  // Pattern 1: If only id, display_name, publication_year -> likely author.id query with select
  if (fields.length === 3 && fields.includes('id') && fields.includes('display_name') && fields.includes('publication_year')) {
    // This looks like filter=author.id:XXXX&select=id,display_name,publication_year
    // Try to infer the author ID from the pattern or use a common one we know exists
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id,display_name,publication_year`;
  }

  // Pattern 2: If only id, display_name -> likely author.id query with select
  if (fields.length === 2 && fields.includes('id') && fields.includes('display_name')) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id,display_name`;
  }

  // Pattern 3: If only id -> likely author.id query with select=id
  if (fields.length === 1 && fields.includes('id')) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id`;
  }

  // Pattern 4: If many fields but specific count, might be a per_page query
  if (results.length === 50) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&per_page=50`;
  }

  // Pattern 5: If 25 results, might be default query
  if (results.length === 25) {
    return `https://api.openalex.org/${entityType}`;
  }

  // Pattern 6: If 200 results, might be topic query with sorting
  if (results.length === 200) {
    return `https://api.openalex.org/${entityType}?sort=works_count,cited_by_count&select=id,display_name,works_count,cited_by_count&per_page=200`;
  }

  return null;
}

/**
 * Remove duplicate entries where both prefixed and non-prefixed versions exist
 * Keep the prefixed version (canonical) and remove the non-prefixed version
 */
function deduplicateIndexEntries(index: UnifiedIndex, entityType: string) {
  const prefix = getEntityPrefix(entityType);
  const keysToRemove: string[] = [];

  for (const key of Object.keys(index)) {
    // Check if this is a non-prefixed entity URL
    const match = key.match(/https:\/\/api\.openalex\.org\/[^/]+\/([^?]+)$/);
    if (match) {
      const entityId = match[1];

      // If this ID doesn't start with the expected prefix
      if (!entityId.startsWith(prefix)) {
        // Check if the prefixed version exists
        const prefixedKey = key.replace(entityId, prefix + entityId);
        if (index[prefixedKey]) {
          // Both versions exist, mark the non-prefixed one for removal
          keysToRemove.push(key);
          console.log(`  🧹 Removing duplicate non-prefixed entry: ${entityId} (keeping ${prefix + entityId})`);
        }
      }
    }
  }

  // Remove the duplicate entries
  for (const key of keysToRemove) {
    delete index[key];
  }
}

/**
 * Save unified index to file with requests wrapper
 */
async function saveUnifiedIndex(dataPath: string, entityType: string, index: UnifiedIndex) {
  const indexPath = join(dataPath, entityType, 'index.json');

  try {
    await mkdir(join(dataPath, entityType), { recursive: true });

    // Convert the index to use $ref pointers while preserving metadata
    const refIndex: Record<string, { $ref: string; lastModified: string; contentHash: string }> = {};

    for (const [canonicalUrl, metadata] of Object.entries(index)) {
      // Generate encoded filename from canonical URL
      const encodedFilename = urlToEncodedKey(canonicalUrl) + '.json';

      // Create $ref pointer to the actual data file with metadata
      refIndex[canonicalUrl] = {
        $ref: `./${encodedFilename}`,
        lastModified: metadata.lastModified || new Date().toISOString(),
        contentHash: metadata.contentHash || ''
      };
    }

    // Write the flattened index directly (no requests wrapper)
    await writeFile(indexPath, JSON.stringify(refIndex, null, 2));
    console.log(`  💾 Saved unified index with $ref pointers and metadata`);
  } catch (error) {
    console.log(`  ❌ Error saving unified index:`, error);
  }
}

/**
 * Decode query filename to extract parameters
 */
function decodeQueryFilename(filename: string): Record<string, unknown> | null {
  const basename = filename.replace(/\.json$/, '');

  // Try encoded format
  try {
    const decoded = Buffer.from(basename, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Create content hash excluding volatile metadata fields and normalizing URLs
 */
function createContentHash(fileContent: string): string {
  try {
    const parsed = JSON.parse(fileContent);

    // Create a copy and remove volatile metadata fields
    const cleanContent = { ...parsed };
    if (cleanContent.meta) {
      delete cleanContent.meta.count;
      delete cleanContent.meta.db_response_time_ms;

      // Normalize URLs in meta to handle URL encoding differences
      if (cleanContent.meta.request_url) {
        cleanContent.meta.request_url = normalizeUrlForDeduplication(cleanContent.meta.request_url);
      }
    }

    // Create hash from cleaned content with consistent ordering
    const cleanedJson = JSON.stringify(cleanContent, Object.keys(cleanContent).sort());
    return createHash('sha256').update(cleanedJson).digest('hex').slice(0, 16);
  } catch (error) {
    // If parsing fails, use original content
    return createHash('sha256').update(fileContent).digest('hex').slice(0, 16);
  }
}

/**
 * Normalize URL by decoding URL-encoded characters for deduplication
 */
function normalizeUrlForDeduplication(url: string): string {
  try {
    // Decode URL-encoded characters for comparison
    return decodeURIComponent(url);
  } catch (error) {
    return url;
  }
}

/**
 * Check if query parameters match
 */
function queryParamsMatch(params1?: Record<string, unknown>, params2?: Record<string, unknown>): boolean {
  if (!params1 || !params2) return false;

  const keys1 = Object.keys(params1).sort();
  const keys2 = Object.keys(params2).sort();

  if (keys1.length !== keys2.length || !keys1.every(key => keys2.includes(key))) {
    return false;
  }

  for (const key of keys1) {
    if (JSON.stringify(params1[key]) !== JSON.stringify(params2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Migrate query files from queries subdirectory to entity directory with simplified names
 */
async function migrateQueryFilesToEntityDirectory(dataPath: string, entityType: string) {
  console.log(`\n🔄 Migrating query files to entity directory for ${entityType}...`);

  const entityDir = join(dataPath, entityType);
  const queriesDir = join(dataPath, entityType, 'queries');
  let movedFiles = 0;

  try {
    const queryFiles = await readdir(queriesDir);

    for (const file of queryFiles) {
      if (file.endsWith('.json') && file !== 'index.json') {
        const queryFilePath = join(queriesDir, file);

        try {
          const fileContent = await readFile(queryFilePath, 'utf-8');

          // Determine if this is a query file and get its canonical URL
          const canonicalUrl = await determineCanonicalQueryUrl(entityType, file.replace('.json', ''), fileContent);

          if (canonicalUrl) {
            // Generate the simplified filename
            const newFilename = generateDescriptiveFilename(canonicalUrl);

            if (newFilename) {
              const newFilePath = join(entityDir, newFilename);

              // Check if the target file already exists
              try {
                await stat(newFilePath);
                console.log(`  ⏭️  File already exists, skipping: ${newFilename}`);
                continue;
              } catch {
                // File doesn't exist, proceed with move
              }

              try {
                // Write to new location with consistent formatting
                const formattedContent = formatJsonConsistently(fileContent);
                await writeFile(newFilePath, formattedContent);
                // Remove from old location
                await unlink(queryFilePath);

                console.log(`  📝 Moved: ${file} → ${newFilename}`);
                movedFiles++;
              } catch (moveError) {
                console.log(`  ❌ Failed to move ${file}:`, moveError);
              }
            } else {
              console.log(`  ⚠️  Could not generate filename for: ${file}`);
            }
          } else {
            console.log(`  ⚠️  Could not determine canonical URL for: ${file}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Could not process query file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.log(`  ⏭️  No queries directory found or error accessing it`);
  }

  if (movedFiles > 0) {
    console.log(`  ✅ Moved ${movedFiles} query files to entity directory`);
  } else {
    console.log(`  ✅ No query files found to move`);
  }
}

/**
 * Generate a descriptive filename from a canonical URL using full URL encoding
 */
function generateDescriptiveFilename(canonicalUrl: string): string | null {
  try {
    // Always use full URL encoding for both entities and queries
    let filename = canonicalUrl
      .replace(/^https:\/\//, 'https-:')   // https:// → https-:
      .replace(/\//g, ':')                 // / → :
      .replace(/=/g, '-')                  // = → -
      .replace(/"/g, '%22');               // " → %22 for JSON safety

    // Add .json extension
    filename = `${filename}.json`;

    return filename;
  } catch (error) {
    return null;
  }
}

/**
 * Generate the main OpenAlex index with JSON $ref structure
 */
async function generateMainIndex(dataPath: string): Promise<void> {
  const mainIndexPath = join(dataPath, 'index.json');

  // Discover entity types by scanning directories with index.json files
  const discoveredEntityTypes: string[] = [];

  try {
    const entries = await readdir(dataPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entityType = entry.name;
        const entityIndexPath = join(dataPath, entityType, 'index.json');

        try {
          await stat(entityIndexPath);
          // Entity index exists
          discoveredEntityTypes.push(entityType);
        } catch (error) {
          // Directory exists but no index.json - skip
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error discovering entity types:', error);
    return;
  }

  // Sort entity types for consistent output
  discoveredEntityTypes.sort();

  // Create JSON Schema compliant main index that references and spreads all entity indexes
  const entityRefs = discoveredEntityTypes.map(entityType => ({
    $ref: `./${entityType}/index.json`
  }));

  const mainIndex = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://api.openalex.org/schema/index",
    title: "OpenAlex Static Data Index",
    description: "Root index merging all entity-specific data via JSON Schema references",
    type: "object",
    version: "1.0.0",
    lastModified: new Date().toISOString(),
    allOf: entityRefs
  };

  // Write the main index
  await writeFile(mainIndexPath, JSON.stringify(mainIndex, null, 2), 'utf-8');
  console.log(`📝 Auto-discovered main index with JSON Schema $ref structure (${discoveredEntityTypes.length} entity types)`);
}