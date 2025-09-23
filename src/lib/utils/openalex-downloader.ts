import { writeFile, stat } from "fs/promises";
import { join } from "path";

/**
 * Entity type mapping for OpenAlex API endpoints
 */
const ENTITY_TYPE_TO_ENDPOINT: Record<string, string> = {
  "authors": "authors",
  "works": "works",
  "institutions": "institutions",
  "topics": "topics",
  "publishers": "publishers",
  "funders": "funders"
} as const;

/**
 * OpenAlex API configuration
 */
const OPENALEX_API_CONFIG = {
  baseUrl: "https://api.openalex.org",
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  timeout: 10000 // 10 seconds
} as const;

/**
 * Download an entity from OpenAlex API and save it to static data
 */
export async function downloadEntityFromOpenAlex(
  entityType: string,
  entityId: string,
  staticDataDir: string
): Promise<boolean> {
  try {
    const endpoint = ENTITY_TYPE_TO_ENDPOINT[entityType];
    if (!endpoint) {
      console.error(`❌ Unknown entity type: ${entityType}`);
      return false;
    }

    // Construct API URL
    const apiUrl = `${OPENALEX_API_CONFIG.baseUrl}/${endpoint}/${entityId}`;

    console.log(`🔄 Downloading ${entityType}/${entityId} from OpenAlex...`);

    // Download with retry logic (preserve original JSON formatting)
    const rawJsonText = await downloadWithRetryRaw(apiUrl);
    if (!rawJsonText) {
      console.error(`❌ Failed to download ${entityType}/${entityId}`);
      return false;
    }

    // Save raw JSON to preserve exact formatting (including 0.0 floats)
    const entityDir = join(staticDataDir, entityType);
    const filePath = join(entityDir, `${entityId}.json`);

    // Pretty-print the JSON while preserving exact number formats from API
    const prettyJson = formatJsonPreservingNumbers(rawJsonText);
    await writeFile(filePath, prettyJson);

    console.log(`✅ Downloaded and saved ${entityType}/${entityId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error downloading ${entityType}/${entityId}:`, error);
    return false;
  }
}

/**
 * Download multiple entities in parallel
 */
export async function downloadMultipleEntities(
  entityType: string,
  entityIds: string[],
  staticDataDir: string,
  maxConcurrency = 5
): Promise<{ downloaded: number; failed: number }> {
  let downloaded = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < entityIds.length; i += maxConcurrency) {
    const batch = entityIds.slice(i, i + maxConcurrency);

    const results = await Promise.allSettled(
      batch.map(entityId => downloadEntityFromOpenAlex(entityType, entityId, staticDataDir))
    );

    results.forEach(result => {
      if (result.status === "fulfilled" && result.value) {
        downloaded++;
      } else {
        failed++;
      }
    });

    // Add delay between batches to be respectful to the API
    if (i + maxConcurrency < entityIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { downloaded, failed };
}

/**
 * Format JSON with pretty-printing while preserving exact number formats
 */
function formatJsonPreservingNumbers(rawJsonText: string): string {
  try {
    // Parse the minified JSON
    const data = JSON.parse(rawJsonText);

    // Create a map of number values to their original string representation
    const numberFormats = new Map<number, string>();

    // Extract all numbers with their original format using regex
    const numberMatches = rawJsonText.matchAll(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);
    for (const match of numberMatches) {
      const numberStr = match[1];
      const numberVal = parseFloat(numberStr);
      if (!numberFormats.has(numberVal) || numberStr.includes(".")) {
        // Prefer formats with decimal points if multiple formats exist
        numberFormats.set(numberVal, numberStr);
      }
    }

    // Custom replacer that preserves original number formats
    const replacer = (key: string, value: unknown): unknown => {
      if (typeof value === "number" && numberFormats.has(value)) {
        // Return a special marker that we'll replace later
        return `__PRESERVE_NUMBER_${value}__`;
      }
      return value;
    };

    // Stringify with pretty printing
    let prettyJson = JSON.stringify(data, replacer, 2);

    // Replace the markers with original number formats
    for (const [numberVal, originalFormat] of numberFormats) {
      const marker = `"__PRESERVE_NUMBER_${numberVal}__"`;
      prettyJson = prettyJson.replaceAll(marker, originalFormat);
    }

    return prettyJson;
  } catch (error) {
    console.warn("Failed to preserve number formats, falling back to standard formatting:", error);
    // Fallback to standard JSON formatting
    const data = JSON.parse(rawJsonText);
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Download with retry logic - returns raw JSON text
 */
async function downloadWithRetryRaw(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= OPENALEX_API_CONFIG.retryAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, OPENALEX_API_CONFIG.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Academic-Explorer/1.0 (https://github.com/Mearman/Academic-Explorer)"
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️  Entity not found (404): ${url}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawText = await response.text();
      return rawText;
    } catch (error) {
      if (attempt === OPENALEX_API_CONFIG.retryAttempts) {
        console.error(`❌ All retry attempts failed for ${url}:`, error);
        return null;
      }

      console.warn(`⚠️  Attempt ${attempt} failed for ${url}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, OPENALEX_API_CONFIG.retryDelay * attempt));
    }
  }

  return null;
}

/**
 * Download with retry logic
 */
async function _downloadWithRetry(url: string): Promise<unknown | null> {
  for (let attempt = 1; attempt <= OPENALEX_API_CONFIG.retryAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, OPENALEX_API_CONFIG.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Academic-Explorer/1.0 (https://github.com/Mearman/Academic-Explorer)"
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️  Entity not found (404): ${url}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt === OPENALEX_API_CONFIG.retryAttempts) {
        console.error(`❌ All retry attempts failed for ${url}:`, error);
        return null;
      }

      console.warn(`⚠️  Attempt ${attempt} failed for ${url}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, OPENALEX_API_CONFIG.retryDelay * attempt));
    }
  }

  return null;
}

/**
 * Check if an entity ID is valid OpenAlex format
 */
export function isValidOpenAlexId(entityId: string): boolean {
  // Basic validation for OpenAlex ID format (e.g., A123456789, W123456789, etc.)
  return /^[AWISTPFC]\d+$/.test(entityId);
}

/**
 * Extract missing entity IDs from an index
 */
export async function findMissingEntities(
  entityType: string,
  entityIds: string[],
  staticDataDir: string
): Promise<string[]> {
  const missing: string[] = [];
  const entityDir = join(staticDataDir, entityType);

  for (const entityId of entityIds) {
    try {
      const filePath = join(entityDir, `${entityId}.json`);
      await stat(filePath);
      // File exists, continue
    } catch {
      // File doesn't exist, add to missing list
      missing.push(entityId);
    }
  }

  return missing;
}