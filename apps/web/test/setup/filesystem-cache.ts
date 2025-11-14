/**
 * Filesystem Cache Helper for E2E Tests
 * Reads from and writes to /public/data/openalex/ directory
 */

import * as fs from 'fs';
import * as path from 'path';

// Note: When running E2E tests, cwd is already 'apps/web'
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public/data/openalex');

export interface CacheReadResult {
  found: boolean;
  data?: unknown;
}

/**
 * Read entity from filesystem cache
 */
export async function readFromFilesystemCache(
  entityType: string,
  id: string
): Promise<CacheReadResult> {
  try {
    // Construct file path: /public/data/openalex/{entityType}/{id}.json
    const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(PUBLIC_DATA_DIR, entityType, `${sanitizedId}.json`);

    if (!fs.existsSync(filePath)) {
      return { found: false };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`✅ Filesystem cache hit: ${entityType}/${id}`);
    return { found: true, data };
  } catch (error) {
    console.warn(`⚠️ Filesystem cache read error: ${entityType}/${id}`, error);
    return { found: false };
  }
}

/**
 * Write entity to filesystem cache
 */
export async function writeToFilesystemCache(
  entityType: string,
  id: string,
  data: unknown
): Promise<void> {
  try {
    // Construct file path
    const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    const entityDir = path.join(PUBLIC_DATA_DIR, entityType);
    const filePath = path.join(entityDir, `${sanitizedId}.json`);

    // Ensure directory exists
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }

    // Write data
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Filesystem cache write: ${entityType}/${id}`);
  } catch (error) {
    console.error(`❌ Filesystem cache write error: ${entityType}/${id}`, error);
  }
}

/**
 * Extract entity ID from OpenAlex URL
 * Examples:
 *  - https://openalex.org/W123 -> W123
 *  - https://api.openalex.org/works/W123 -> W123
 *  - W123 -> W123
 */
export function extractEntityId(idOrUrl: string): string {
  if (!idOrUrl) return '';

  // Extract from full OpenAlex URL
  const openalexMatch = idOrUrl.match(/openalex\.org\/([A-Z]\d+)/);
  if (openalexMatch) return openalexMatch[1];

  // Extract from API URL
  const apiMatch = idOrUrl.match(/\/([A-Z]\d+)$/);
  if (apiMatch) return apiMatch[1];

  // Already clean ID
  return idOrUrl;
}

/**
 * Detect entity type from ID prefix
 */
export function detectEntityType(id: string): string | null {
  const cleanId = extractEntityId(id);
  if (!cleanId) return null;

  if (cleanId.startsWith('W')) return 'works';
  if (cleanId.startsWith('A')) return 'authors';
  if (cleanId.startsWith('S')) return 'sources';
  if (cleanId.startsWith('I')) return 'institutions';
  if (cleanId.startsWith('T')) return 'topics';
  if (cleanId.startsWith('P')) return 'publishers';
  if (cleanId.startsWith('F')) return 'funders';
  if (cleanId.startsWith('C')) return 'concepts';

  return null;
}
