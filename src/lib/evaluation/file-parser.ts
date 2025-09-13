/**
 * File parsing utilities for STAR dataset processing
 * Supports CSV, JSON, and Excel files for systematic literature review data
 */

import type { WorkReference, STARDataset } from './types';

/**
 * Supported file formats for STAR dataset upload
 */
export type SupportedFileFormat = 'csv' | 'json' | 'excel';

/**
 * Raw parsed data from file before processing into WorkReference format
 */
export interface RawPaperData {
  title?: string;
  authors?: string | string[];
  doi?: string;
  year?: string | number;
  source?: string;
  abstract?: string;
  keywords?: string | string[];
  included?: boolean | string;
  excluded?: boolean | string;
  [key: string]: unknown;
}

/**
 * Parse result containing extracted papers and metadata
 */
export interface ParseResult {
  papers: WorkReference[];
  metadata: {
    totalRecords: number;
    includedCount: number;
    excludedCount: number;
    errors: string[];
    detectedFormat: SupportedFileFormat;
  };
}

/**
 * Configuration for parsing STAR dataset files
 */
export interface ParseConfig {
  titleColumn?: string;
  authorsColumn?: string;
  doiColumn?: string;
  yearColumn?: string;
  sourceColumn?: string;
  includedColumn?: string;
  excludedColumn?: string;
  abstractColumn?: string;
  keywordsColumn?: string;
  hasHeader?: boolean;
  delimiter?: string; // For CSV files
  sheetName?: string; // For Excel files
}

/**
 * Default column mappings for common STAR dataset formats
 */
export const DEFAULT_COLUMN_MAPPINGS: ParseConfig = {
  titleColumn: 'title',
  authorsColumn: 'authors',
  doiColumn: 'doi',
  yearColumn: 'year',
  sourceColumn: 'source',
  includedColumn: 'included',
  excludedColumn: 'excluded',
  abstractColumn: 'abstract',
  keywordsColumn: 'keywords',
  hasHeader: true,
  delimiter: ',',
  sheetName: 'Sheet1'
};

/**
 * Detect file format based on file extension and content
 */
export function detectFileFormat(file: File): SupportedFileFormat {
  const extension = file.name.toLowerCase().split('.').pop();

  switch (extension) {
    case 'csv':
    case 'txt':
      return 'csv';
    case 'json':
      return 'json';
    case 'xlsx':
    case 'xls':
      return 'excel';
    default:
      // Default to CSV for unknown formats
      return 'csv';
  }
}

/**
 * Parse CSV content into raw data records
 */
function parseCSVContent(content: string, config: ParseConfig): RawPaperData[] {
  const delimiter = config.delimiter || ',';
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return [];
  }

  // Parse header row if present
  let headers: string[] = [];
  let startIndex = 0;

  if (config.hasHeader) {
    headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    startIndex = 1;
  } else {
    // Generate generic headers if no header row
    const firstRow = lines[0].split(delimiter);
    headers = firstRow.map((_, index) => `column_${index}`);
  }

  // Parse data rows
  const records: RawPaperData[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
    const record: RawPaperData = {};

    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        record[header] = values[index];
      }
    });

    records.push(record);
  }

  return records;
}

/**
 * Parse JSON content into raw data records
 */
function parseJSONContent(content: string): RawPaperData[] {
  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed as RawPaperData[];
    } else if (parsed && typeof parsed === 'object') {
      // Handle single object
      return [parsed as RawPaperData];
    } else {
      throw new Error('Invalid JSON structure');
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Excel content (placeholder - would need a library like xlsx)
 * For now, returns empty array with error
 */
function parseExcelContent(file: File, config: ParseConfig): Promise<RawPaperData[]> {
  // TODO: Implement Excel parsing using a library like 'xlsx'
  // This is a placeholder that would require adding xlsx dependency
  return Promise.resolve([]);
}

/**
 * Clean and normalize author string/array
 */
function normalizeAuthors(authors: string | string[] | undefined): string[] {
  if (!authors) return [];

  if (Array.isArray(authors)) {
    return authors.filter(a => typeof a === 'string' && a.trim()).map(a => a.trim());
  }

  if (typeof authors === 'string') {
    // Split by common delimiters: semicolon, comma, and
    return authors
      .split(/[;,&]|\sand\s/)
      .map(author => author.trim())
      .filter(author => author.length > 0);
  }

  return [];
}

/**
 * Convert raw paper data to WorkReference format
 */
function convertToWorkReference(rawData: RawPaperData, config: ParseConfig): WorkReference | null {
  const title = rawData[config.titleColumn || 'title'] as string;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return null; // Skip records without title
  }

  const authors = normalizeAuthors(rawData[config.authorsColumn || 'authors'] as string | string[]);
  const doi = rawData[config.doiColumn || 'doi'] as string;
  const yearValue = rawData[config.yearColumn || 'year'];
  const source = rawData[config.sourceColumn || 'source'] as string;

  // Parse publication year
  let publicationYear: number | undefined;
  if (yearValue) {
    const yearNum = typeof yearValue === 'number' ? yearValue : parseInt(yearValue.toString(), 10);
    if (!isNaN(yearNum) && yearNum > 1800 && yearNum <= new Date().getFullYear() + 5) {
      publicationYear = yearNum;
    }
  }

  return {
    title: title.trim(),
    authors,
    doi: doi && typeof doi === 'string' ? doi.trim() : undefined,
    publicationYear,
    source: source && typeof source === 'string' ? source.trim() : 'Unknown',
    openalexId: undefined // Will be populated later through matching
  };
}

/**
 * Determine if a paper is included or excluded based on columns
 */
function determineInclusionStatus(rawData: RawPaperData, config: ParseConfig): 'included' | 'excluded' | 'unknown' {
  const includedValue = rawData[config.includedColumn || 'included'];
  const excludedValue = rawData[config.excludedColumn || 'excluded'];

  // Check included column
  if (includedValue !== undefined) {
    if (typeof includedValue === 'boolean') {
      return includedValue ? 'included' : 'excluded';
    }
    if (typeof includedValue === 'string') {
      const normalized = includedValue.toLowerCase().trim();
      if (normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'included') {
        return 'included';
      }
      if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === 'excluded') {
        return 'excluded';
      }
    }
  }

  // Check excluded column
  if (excludedValue !== undefined) {
    if (typeof excludedValue === 'boolean') {
      return excludedValue ? 'excluded' : 'included';
    }
    if (typeof excludedValue === 'string') {
      const normalized = excludedValue.toLowerCase().trim();
      if (normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'excluded') {
        return 'excluded';
      }
      if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === 'included') {
        return 'included';
      }
    }
  }

  return 'unknown';
}

/**
 * Main file parsing function
 */
export async function parseSTARFile(
  file: File,
  config: ParseConfig = DEFAULT_COLUMN_MAPPINGS
): Promise<ParseResult> {
  const format = detectFileFormat(file);
  const errors: string[] = [];
  let rawRecords: RawPaperData[] = [];

  try {
    // Read file content
    const content = await file.text();

    // Parse based on format
    switch (format) {
      case 'csv':
        rawRecords = parseCSVContent(content, config);
        break;
      case 'json':
        rawRecords = parseJSONContent(content);
        break;
      case 'excel':
        rawRecords = await parseExcelContent(file, config);
        errors.push('Excel parsing not yet implemented - please convert to CSV or JSON');
        break;
      default:
        throw new Error(`Unsupported file format: ${format}`);
    }
  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      papers: [],
      metadata: {
        totalRecords: 0,
        includedCount: 0,
        excludedCount: 0,
        errors,
        detectedFormat: format
      }
    };
  }

  // Convert to WorkReference format
  const allPapers: WorkReference[] = [];
  const includedPapers: WorkReference[] = [];
  const excludedPapers: WorkReference[] = [];

  rawRecords.forEach((rawData, index) => {
    const workRef = convertToWorkReference(rawData, config);

    if (!workRef) {
      errors.push(`Row ${index + 1}: Missing or invalid title`);
      return;
    }

    allPapers.push(workRef);

    const inclusionStatus = determineInclusionStatus(rawData, config);

    switch (inclusionStatus) {
      case 'included':
        includedPapers.push(workRef);
        break;
      case 'excluded':
        excludedPapers.push(workRef);
        break;
      case 'unknown':
        // If no inclusion/exclusion status, assume included for now
        includedPapers.push(workRef);
        break;
    }
  });

  return {
    papers: allPapers,
    metadata: {
      totalRecords: rawRecords.length,
      includedCount: includedPapers.length,
      excludedCount: excludedPapers.length,
      errors,
      detectedFormat: format
    }
  };
}

/**
 * Create STARDataset from parsed file result
 */
export function createSTARDatasetFromParseResult(
  file: File,
  parseResult: ParseResult,
  reviewTopic: string
): STARDataset {
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    uploadDate: new Date(),
    reviewTopic,
    originalPaperCount: parseResult.metadata.totalRecords,
    includedPapers: parseResult.papers.filter((_, index) =>
      index < parseResult.metadata.includedCount
    ),
    excludedPapers: parseResult.papers.filter((_, index) =>
      index >= parseResult.metadata.includedCount
    ),
    searchStrategy: {
      databases: ['Unknown'],
      keywords: [],
      dateRange: {
        start: undefined,
        end: undefined
      },
      inclusionCriteria: [],
      exclusionCriteria: []
    },
    methodology: {
      prismaCompliant: false,
      screeningLevels: 1,
      reviewersCount: 1,
      conflictResolution: 'Unknown'
    },
    metadata: {
      description: `Uploaded from ${file.name} (${parseResult.metadata.detectedFormat.toUpperCase()})`,
      methodology: 'STAR',
      originalSource: file.name,
      dateRange: `${parseResult.metadata.totalRecords} records processed`
    }
  };
}