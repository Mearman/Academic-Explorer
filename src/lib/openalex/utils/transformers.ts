/**
 * Response transformers and data utilities for OpenAlex API
 */

import type {
  Work,
  Continent,
  Region,
} from '../types';

// Transform abstract from inverted index to plain text
export function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | null {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
    return null;
  }

  // Create array with proper size
  const maxIndex = Math.max(
    ...Object.values(invertedIndex).flatMap(indices => indices)
  );
  const words = new Array(maxIndex + 1);

  // Place words at their indices
  Object.entries(invertedIndex).forEach(([word, indices]) => {
    indices.forEach(index => {
      words[index] = word;
    });
  });

  // Join words and clean up
  return words
    .filter(word => word !== undefined)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract author names from work
export function extractAuthorNames(work: Work): string[] {
  if (!work.authorships) return [];
  return work.authorships.map(authorship => authorship.author.display_name);
}

// Extract institution names from work
export function extractInstitutionNames(work: Work): string[] {
  const institutions = new Set<string>();
  
  if (!work.authorships) return [];
  
  work.authorships.forEach(authorship => {
    authorship.institutions.forEach(institution => {
      institutions.add(institution.display_name);
    });
  });
  
  return Array.from(institutions);
}

// Get best available URL for accessing a work
export function getBestAccessUrl(work: Work): string | null {
  // First try OA URL
  if (work.open_access?.oa_url) {
    return work.open_access.oa_url;
  }
  
  // Then try best OA location
  if (work.best_oa_location?.pdf_url) {
    return work.best_oa_location.pdf_url;
  }
  
  if (work.best_oa_location?.landing_page_url) {
    return work.best_oa_location.landing_page_url;
  }
  
  // Try primary location
  if (work.primary_location?.pdf_url) {
    return work.primary_location.pdf_url;
  }
  
  if (work.primary_location?.landing_page_url) {
    return work.primary_location.landing_page_url;
  }
  
  // Try any location with PDF
  const pdfLocation = work.locations?.find(loc => loc.pdf_url);
  if (pdfLocation?.pdf_url) {
    return pdfLocation.pdf_url;
  }
  
  // Try any location with landing page
  const landingLocation = work.locations?.find(loc => loc.landing_page_url);
  if (landingLocation?.landing_page_url) {
    return landingLocation.landing_page_url;
  }
  
  // Fallback to DOI
  if (work.doi) {
    return `https://doi.org/${work.doi}`;
  }
  
  return null;
}

// Format citation in various styles
export interface CitationOptions {
  style?: 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver' | 'bibtex';
  includeUrl?: boolean;
  includeDoi?: boolean;
  maxAuthors?: number;
}

export function formatCitation(work: Work, options: CitationOptions = {}): string {
  const { style = 'apa', includeUrl = false, includeDoi = false } = options;
  const authors = extractAuthorNames(work);
  const year = work.publication_year || 'n.d.';
  const title = work.display_name || 'Untitled';
  
  let citation = '';
  
  switch (style) {
    case 'apa': {
      // APA: Author, A. A. (Year). Title. Source.
      const authorList = formatAuthorListAPA(authors);
      citation = `${authorList} (${year}). ${title}`;
      
      if (work.primary_location?.source?.display_name) {
        citation += `. ${work.primary_location.source.display_name}`;
      }
      
      if (work.biblio?.volume) {
        citation += `, ${work.biblio.volume}`;
        if (work.biblio.issue) {
          citation += `(${work.biblio.issue})`;
        }
      }
      
      if (work.biblio?.first_page && work.biblio?.last_page) {
        citation += `, ${work.biblio.first_page}-${work.biblio.last_page}`;
      }
      
      break;
    }
    
    case 'mla': {
      // MLA: Author. "Title." Source, vol. #, no. #, Year, pp. ##-##.
      const authorList = formatAuthorListMLA(authors);
      citation = `${authorList} "${title}."`;
      
      if (work.primary_location?.source?.display_name) {
        citation += ` ${work.primary_location.source.display_name}`;
      }
      
      if (work.biblio?.volume) {
        citation += `, vol. ${work.biblio.volume}`;
      }
      
      if (work.biblio?.issue) {
        citation += `, no. ${work.biblio.issue}`;
      }
      
      citation += `, ${year}`;
      
      if (work.biblio?.first_page && work.biblio?.last_page) {
        citation += `, pp. ${work.biblio.first_page}-${work.biblio.last_page}`;
      }
      
      citation += '.';
      break;
    }
    
    // Add more citation styles as needed
    default:
      citation = `${authors.join(', ')} (${year}). ${title}.`;
  }
  
  if (includeDoi && work.doi) {
    // Extract just the DOI part if it's a URL
    const doi = work.doi.replace('https://doi.org/', '');
    citation += ` https://doi.org/${doi}`;
  } else if (includeUrl && work.doi) {
    citation += ` https://doi.org/${work.doi}`;
  }
  
  return citation;
}

function formatAuthorListAPA(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length === 1) return formatAuthorAPA(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorAPA(authors[0])} & ${formatAuthorAPA(authors[1])}`;
  }
  if (authors.length <= 7) {
    const formatted = authors.slice(0, -1).map(formatAuthorAPA).join(', ');
    return `${formatted}, & ${formatAuthorAPA(authors[authors.length - 1])}`;
  }
  // More than 7 authors
  const firstSix = authors.slice(0, 6).map(formatAuthorAPA).join(', ');
  return `${firstSix}, ... ${formatAuthorAPA(authors[authors.length - 1])}`;
}

function formatAuthorAPA(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0];
  
  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p[0]?.toUpperCase() + '.').join(' ');
  
  return `${lastName}, ${initials}`;
}

function formatAuthorListMLA(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) {
    return `${authors[0]} and ${authors[1]}`;
  }
  return `${authors[0]}, et al.`;
}

// Calculate collaboration metrics
export interface CollaborationMetrics {
  authorCount: number;
  institutionCount: number;
  countryCount: number;
  isInternational: boolean;
  isInterInstitutional: boolean;
  isSingleAuthor: boolean;
  averageAuthorsPerInstitution: number;
  correspondingAuthors: string[];
}

export function calculateCollaborationMetrics(work: Work): CollaborationMetrics {
  if (!work.authorships) {
    return {
      authorCount: 0,
      institutionCount: 0,
      countryCount: 0,
      isInternational: false,
      isInterInstitutional: false,
      isSingleAuthor: false,
      averageAuthorsPerInstitution: 0,
      correspondingAuthors: [],
    };
  }

  const institutions = new Set<string>();
  const countries = new Set<string>();
  const correspondingAuthors: string[] = [];
  
  work.authorships.forEach(authorship => {
    if (authorship.is_corresponding) {
      correspondingAuthors.push(authorship.author.display_name);
    }
    
    if (authorship.institutions) {
      authorship.institutions.forEach(inst => {
        institutions.add(inst.id);
        if (inst.country_code) {
          countries.add(inst.country_code);
        }
      });
    }
    
    authorship.countries?.forEach(country => {
      countries.add(country);
    });
  });
  
  // Use Work's distinct counts if available
  const institutionCount = work.institutions_distinct_count ?? institutions.size;
  const countryCount = work.countries_distinct_count ?? countries.size;
  
  return {
    authorCount: work.authorships.length,
    institutionCount,
    countryCount,
    isInternational: countryCount > 1,
    isInterInstitutional: institutionCount > 1,
    isSingleAuthor: work.authorships.length === 1,
    averageAuthorsPerInstitution: institutionCount > 0 
      ? work.authorships.length / institutionCount 
      : 0,
    correspondingAuthors,
  };
}

// Extract keywords from various sources
export function extractAllKeywords(work: Work): string[] {
  const keywords = new Set<string>();
  
  // Add direct keywords (can be strings or objects)
  work.keywords?.forEach(kw => {
    if (typeof kw === 'string') {
      keywords.add(kw);
    } else if (kw && typeof kw === 'object' && 'display_name' in kw) {
      keywords.add((kw as { display_name: string }).display_name);
    }
  });
  
  // Add topic keywords (only available on full Topic entities, not DehydratedTopic)
  work.topics?.forEach((topic) => {
    if ('keywords' in topic && Array.isArray(topic.keywords)) {
      (topic.keywords as string[]).forEach((kw: string) => keywords.add(kw));
    }
  });
  
  // Add concept names (if using legacy concepts)
  work.concepts?.forEach(concept => {
    keywords.add(concept.display_name);
  });
  
  return Array.from(keywords);
}

// Group works by various criteria
export function groupWorksBy<K extends keyof Work>(
  works: Work[],
  key: K,
  groupTransform?: (value: Work[K]) => string
): Record<string, Work[]> {
  const groups: Record<string, Work[]> = {};
  
  works.forEach(work => {
    const value = work[key];
    const groupKey = groupTransform ? groupTransform(value) : String(value);
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(work);
  });
  
  return groups;
}

// Calculate temporal distribution
export interface TemporalDistribution {
  years: number[];
  counts: Record<number, number>;
  totalWorks: number;
  citationsByYear?: Record<number, number>;
  range?: {
    min: number;
    max: number;
  };
}

export function calculateTemporalDistribution(works: Work[]): TemporalDistribution {
  const counts: Record<number, number> = {};
  const yearSet = new Set<number>();
  
  works.forEach(work => {
    if (work.publication_year) {
      yearSet.add(work.publication_year);
      counts[work.publication_year] = (counts[work.publication_year] || 0) + 1;
    }
  });
  
  const years = Array.from(yearSet).sort((a, b) => a - b);
  
  return {
    years,
    counts,
    totalWorks: works.length,
    range: years.length > 0 ? {
      min: years[0],
      max: years[years.length - 1],
    } : undefined,
  };
}

// Network analysis helpers
export interface CoAuthorshipNetwork {
  nodes: Array<{
    id: string;
    name: string;
    works: number;
    citations: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number; // Number of co-authored works
  }>;
}

export function buildCoAuthorshipNetwork(works: Work[]): CoAuthorshipNetwork {
  const authorMap = new Map<string, { name: string; works: Set<string>; citations: number }>();
  const edgeMap = new Map<string, number>();
  
  works.forEach(work => {
    const authorIds = work.authorships.map(a => a.author.id);
    
    // Update author nodes
    work.authorships.forEach(authorship => {
      const {author} = authorship;
      if (!authorMap.has(author.id)) {
        authorMap.set(author.id, {
          name: author.display_name,
          works: new Set(),
          citations: 0,
        });
      }
      const authorData = authorMap.get(author.id)!;
      authorData.works.add(work.id);
      authorData.citations += work.cited_by_count;
    });
    
    // Update edges (co-authorships)
    for (let i = 0; i < authorIds.length; i++) {
      for (let j = i + 1; j < authorIds.length; j++) {
        const edgeKey = [authorIds[i], authorIds[j]].sort().join('-');
        edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1);
      }
    }
  });
  
  // Build network structure
  const nodes = Array.from(authorMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    works: data.works.size,
    citations: data.citations,
  }));
  
  const edges = Array.from(edgeMap.entries()).map(([key, weight]) => {
    const [source, target] = key.split('-');
    return { source, target, weight };
  });
  
  return { nodes, edges };
}

// Export utility to convert entities to CSV/TSV
export function entitiesToCSV<T extends Record<string, unknown>>(
  entities: T[],
  fields?: (keyof T)[],
  delimiter = ','
): string {
  if (entities.length === 0) return '';
  
  const keys = fields || (Object.keys(entities[0]) as (keyof T)[]);
  
  // Header row - simple format without quotes
  const header = keys.map(key => String(key)).join(delimiter);
  
  // Data rows
  const rows = entities.map(entity => {
    return keys.map(key => {
      const value = entity[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // Only quote if contains delimiter or quotes
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(delimiter);
  });
  
  return [header, ...rows].join('\n');
}

// Export continents to CSV format
export function continentsToCSV(continents: Continent[], delimiter = ','): string {
  if (continents.length === 0) return '';
  
  const fields: (keyof Continent)[] = [
    'id',
    'display_name',
    'wikidata',
    'works_count',
    'cited_by_count'
  ];
  
  // Convert to records for CSV export
  const records = continents.map(continent => ({ ...continent }));
  return entitiesToCSV(records, fields, delimiter);
}

// Export regions to CSV format
export function regionsToCSV(regions: Region[], delimiter = ','): string {
  if (regions.length === 0) return '';
  
  const fields: (keyof Region)[] = [
    'id',
    'display_name',
    'description',
    'wikidata',
    'works_count',
    'cited_by_count'
  ];
  
  // Convert to records for CSV export
  const records = regions.map(region => ({ ...region }));
  return entitiesToCSV(records, fields, delimiter);
}

// Extract continent name from entity
export function extractContinentName(entity?: Continent | null): string | null {
  if (!entity) return null;
  return entity.display_name || null;
}

// Extract region name from entity
export function extractRegionName(entity?: Region | null): string | null {
  if (!entity) return null;
  return entity.display_name || null;
}

// Format geographic entity (Continent or Region) for display
export function formatGeoEntity(entity?: Continent | Region | null): string | null {
  if (!entity) return null;
  
  let formatted = entity.display_name;
  
  // Add wikidata info if available
  if (entity.wikidata) {
    formatted += ` (${entity.wikidata})`;
  }
  
  return formatted;
}

// Deduplicate entities by ID
export function deduplicateEntities<T extends { id: string }>(entities: T[]): T[] {
  const seen = new Set<string>();
  return entities.filter(entity => {
    if (seen.has(entity.id)) return false;
    seen.add(entity.id);
    return true;
  });
}

/**
 * Format numbers with locale-appropriate thousands separators and abbreviations
 */
export function formatNumber(
  value: number | string,
  options: {
    format?: 'number' | 'percentage' | 'currency' | 'compact';
    locale?: string;
    currency?: string;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    format = 'number',
    locale = 'en-US',
    currency = 'USD',
    maximumFractionDigits = format === 'percentage' ? 1 : 0,
  } = options;

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }

  switch (format) {
    case 'percentage':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits,
      }).format(numValue / 100);
      
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits,
      }).format(numValue);
      
    case 'compact':
      if (numValue >= 1000000) {
        return (numValue / 1000000).toFixed(1) + 'M';
      } else if (numValue >= 1000) {
        return (numValue / 1000).toFixed(1) + 'K';
      } else {
        return numValue.toString();
      }
      
    case 'number':
    default:
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits,
      }).format(numValue);
  }
}