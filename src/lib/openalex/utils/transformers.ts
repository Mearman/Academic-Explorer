/**
 * Response transformers and data utilities for OpenAlex API
 */

import type {
  Work,
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
  return work.authorships.map(authorship => authorship.author.display_name);
}

// Extract institution names from work
export function extractInstitutionNames(work: Work): string[] {
  const institutions = new Set<string>();
  
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
  if (work.open_access.oa_url) {
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
  style?: 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';
  includeUrl?: boolean;
}

export function formatCitation(work: Work, options: CitationOptions = {}): string {
  const { style = 'apa', includeUrl = false } = options;
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
  
  if (includeUrl && work.doi) {
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
  totalAuthors: number;
  totalInstitutions: number;
  totalCountries: number;
  internationalCollaboration: boolean;
  institutionalCollaboration: boolean;
  averageAuthorsPerInstitution: number;
  correspondingAuthors: string[];
}

export function calculateCollaborationMetrics(work: Work): CollaborationMetrics {
  const institutions = new Set<string>();
  const countries = new Set<string>();
  const correspondingAuthors: string[] = [];
  
  work.authorships.forEach(authorship => {
    if (authorship.is_corresponding) {
      correspondingAuthors.push(authorship.author.display_name);
    }
    
    authorship.institutions.forEach(inst => {
      institutions.add(inst.id);
      if (inst.country_code) {
        countries.add(inst.country_code);
      }
    });
    
    authorship.countries?.forEach(country => {
      countries.add(country);
    });
  });
  
  return {
    totalAuthors: work.authorships.length,
    totalInstitutions: institutions.size,
    totalCountries: countries.size,
    internationalCollaboration: countries.size > 1,
    institutionalCollaboration: institutions.size > 1,
    averageAuthorsPerInstitution: institutions.size > 0 
      ? work.authorships.length / institutions.size 
      : 0,
    correspondingAuthors,
  };
}

// Extract keywords from various sources
export function extractAllKeywords(work: Work): string[] {
  const keywords = new Set<string>();
  
  // Add direct keywords
  work.keywords?.forEach(kw => {
    keywords.add(kw.display_name);
  });
  
  // Add topic keywords
  work.topics?.forEach(topic => {
    topic.keywords?.forEach(kw => keywords.add(kw));
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
  key: K
): Map<Work[K], Work[]> {
  const groups = new Map<Work[K], Work[]>();
  
  works.forEach(work => {
    const value = work[key];
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value)!.push(work);
  });
  
  return groups;
}

// Calculate temporal distribution
export interface TemporalDistribution {
  yearlyDistribution: Map<number, number>;
  monthlyDistribution?: Map<string, number>;
  range: {
    min: number;
    max: number;
  };
  median: number;
  mode: number;
}

export function calculateTemporalDistribution(works: Work[]): TemporalDistribution {
  const yearlyDistribution = new Map<number, number>();
  const monthlyDistribution = new Map<string, number>();
  const years: number[] = [];
  
  works.forEach(work => {
    if (work.publication_year) {
      years.push(work.publication_year);
      yearlyDistribution.set(
        work.publication_year,
        (yearlyDistribution.get(work.publication_year) || 0) + 1
      );
    }
    
    if (work.publication_date) {
      const month = work.publication_date.substring(0, 7); // YYYY-MM
      monthlyDistribution.set(
        month,
        (monthlyDistribution.get(month) || 0) + 1
      );
    }
  });
  
  years.sort((a, b) => a - b);
  
  // Calculate mode (most frequent year)
  let mode = 0;
  let maxCount = 0;
  yearlyDistribution.forEach((count, year) => {
    if (count > maxCount) {
      maxCount = count;
      mode = year;
    }
  });
  
  return {
    yearlyDistribution,
    monthlyDistribution: monthlyDistribution.size > 0 ? monthlyDistribution : undefined,
    range: {
      min: Math.min(...years),
      max: Math.max(...years),
    },
    median: years[Math.floor(years.length / 2)] || 0,
    mode,
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
      const author = authorship.author;
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
  
  // Header row
  const header = keys.map(key => `"${String(key)}"`).join(delimiter);
  
  // Data rows
  const rows = entities.map(entity => {
    return keys.map(key => {
      const value = entity[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(delimiter);
  });
  
  return [header, ...rows].join('\n');
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