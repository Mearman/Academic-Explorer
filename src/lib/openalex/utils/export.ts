/**
 * Data export utilities for OpenAlex entities
 * Supports BibTeX, RIS, and CSV export formats
 */

import type { Work, Author } from '../types';

/**
 * Export works to BibTeX format
 * @param works Array of Work objects to export
 * @returns BibTeX formatted string
 * @example
 * const bibtex = exportToBibTeX(works);
 * // Save to file or copy to clipboard
 */
export function exportToBibTeX(works: Work[]): string {
  const entries: string[] = [];

  for (const work of works) {
    const type = getBibTeXType(work.type);
    const id = work.id.replace('https://openalex.org/', '');
    const authors = formatBibTeXAuthors(work.authorships);
    const year = work.publication_year || new Date().getFullYear();
    const title = work.title || work.display_name || 'Untitled';
    
    let entry = `@${type}{${id},\n`;
    entry += `  title = {${escapeBibTeX(title)}},\n`;
    entry += `  author = {${authors}},\n`;
    entry += `  year = {${year}}`;

    // Add optional fields
    if (work.doi) {
      entry += `,\n  doi = {${work.doi}}`;
    }

    if (work.primary_location?.source?.display_name) {
      if (type === 'article') {
        entry += `,\n  journal = {${escapeBibTeX(work.primary_location.source.display_name)}}`;
      } else if (type === 'inproceedings') {
        entry += `,\n  booktitle = {${escapeBibTeX(work.primary_location.source.display_name)}}`;
      }
    }

    if (work.biblio?.volume) {
      entry += `,\n  volume = {${work.biblio.volume}}`;
    }

    if (work.biblio?.issue) {
      entry += `,\n  number = {${work.biblio.issue}}`;
    }

    if (work.biblio?.first_page && work.biblio?.last_page) {
      entry += `,\n  pages = {${work.biblio.first_page}--${work.biblio.last_page}}`;
    } else if (work.biblio?.first_page) {
      entry += `,\n  pages = {${work.biblio.first_page}}`;
    }

    if (work.primary_location?.pdf_url) {
      entry += `,\n  url = {${work.primary_location.pdf_url}}`;
    } else if (work.primary_location?.landing_page_url) {
      entry += `,\n  url = {${work.primary_location.landing_page_url}}`;
    }

    if (work.abstract_inverted_index) {
      const abstract = reconstructAbstract(work.abstract_inverted_index);
      if (abstract) {
        entry += `,\n  abstract = {${escapeBibTeX(abstract)}}`;
      }
    }

    entry += '\n}\n';
    entries.push(entry);
  }

  return entries.join('\n');
}

/**
 * Export works to RIS format
 * @param works Array of Work objects to export
 * @returns RIS formatted string
 * @example
 * const ris = exportToRIS(works);
 */
export function exportToRIS(works: Work[]): string {
  const entries: string[] = [];

  for (const work of works) {
    const type = getRISType(work.type);
    const lines: string[] = [];
    
    lines.push(`TY  - ${type}`);
    
    // Title
    if (work.title || work.display_name) {
      lines.push(`TI  - ${work.title || work.display_name}`);
    }

    // Authors
    for (const authorship of work.authorships) {
      if (authorship.author.display_name) {
        lines.push(`AU  - ${authorship.author.display_name}`);
      }
    }

    // Year
    if (work.publication_year) {
      lines.push(`PY  - ${work.publication_year}`);
    }

    // Publication date
    if (work.publication_date) {
      lines.push(`DA  - ${work.publication_date}`);
    }

    // Journal/Source
    if (work.primary_location?.source?.display_name) {
      lines.push(`JO  - ${work.primary_location.source.display_name}`);
    }

    // Volume
    if (work.biblio?.volume) {
      lines.push(`VL  - ${work.biblio.volume}`);
    }

    // Issue
    if (work.biblio?.issue) {
      lines.push(`IS  - ${work.biblio.issue}`);
    }

    // Pages
    if (work.biblio?.first_page) {
      lines.push(`SP  - ${work.biblio.first_page}`);
    }
    if (work.biblio?.last_page) {
      lines.push(`EP  - ${work.biblio.last_page}`);
    }

    // DOI
    if (work.doi) {
      lines.push(`DO  - ${work.doi}`);
    }

    // URL
    if (work.primary_location?.landing_page_url) {
      lines.push(`UR  - ${work.primary_location.landing_page_url}`);
    }

    // Abstract
    if (work.abstract_inverted_index) {
      const abstract = reconstructAbstract(work.abstract_inverted_index);
      if (abstract) {
        lines.push(`AB  - ${abstract}`);
      }
    }

    // Language
    if (work.language) {
      lines.push(`LA  - ${work.language}`);
    }

    // End of record
    lines.push('ER  -');
    
    entries.push(lines.join('\n'));
  }

  return entries.join('\n\n');
}

/**
 * Export entities to CSV format
 * @param entities Array of entities to export
 * @param fields Fields to include in the CSV
 * @returns CSV formatted string
 * @example
 * const csv = exportToCSV(works, ['id', 'title', 'publication_year', 'doi', 'cited_by_count']);
 */
export function exportToCSV<T extends Record<string, unknown>>(
  entities: T[],
  fields?: string[]
): string {
  if (entities.length === 0) {
    return '';
  }

  // Auto-detect fields if not provided
  const csvFields = fields || Object.keys(entities[0] as Record<string, unknown>);
  
  // Header row
  const header = csvFields.map(field => escapeCSV(field)).join(',');
  
  // Data rows
  const rows = entities.map(entity => {
    return csvFields.map(field => {
      const value = getNestedValue(entity, field);
      return escapeCSV(formatCSVValue(value));
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Export works summary to CSV
 * @param works Array of Work objects
 * @returns CSV with commonly needed fields
 */
export function exportWorksToCSV(works: Work[]): string {
  const data = works.map(work => ({
    id: work.id,
    doi: work.doi || '',
    title: work.title || work.display_name || '',
    publication_year: work.publication_year || '',
    publication_date: work.publication_date || '',
    type: work.type || '',
    journal: work.primary_location?.source?.display_name || '',
    is_oa: work.open_access?.is_oa || false,
    oa_status: work.open_access?.oa_status || '',
    cited_by_count: work.cited_by_count || 0,
    authors: work.authorships.map(a => a.author.display_name).join('; '),
    institutions: work.authorships
      .flatMap(a => a.institutions.map(i => i.display_name))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .join('; '),
    language: work.language || '',
    url: work.primary_location?.landing_page_url || work.doi ? `https://doi.org/${work.doi}` : ''
  }));

  return exportToCSV(data);
}

/**
 * Export authors summary to CSV
 * @param authors Array of Author objects
 * @returns CSV with commonly needed fields
 */
export function exportAuthorsToCSV(authors: Author[]): string {
  const data = authors.map(author => ({
    id: author.id,
    orcid: author.orcid || '',
    display_name: author.display_name || '',
    works_count: author.works_count || 0,
    cited_by_count: author.cited_by_count || 0,
    h_index: author.summary_stats?.h_index || 0,
    i10_index: author.summary_stats?.i10_index || 0,
    last_known_institutions: author.last_known_institutions
      ?.map(i => i.display_name)
      .join('; ') || '',
    created_date: author.created_date || '',
    updated_date: author.updated_date || ''
  }));

  return exportToCSV(data);
}

// Helper functions

function getBibTeXType(type?: string): string {
  const typeMap: Record<string, string> = {
    'journal-article': 'article',
    'book': 'book',
    'book-chapter': 'incollection',
    'dissertation': 'phdthesis',
    'conference-paper': 'inproceedings',
    'proceedings': 'proceedings',
    'report': 'techreport',
    'preprint': 'unpublished',
    'dataset': 'misc',
    'other': 'misc'
  };
  
  return typeMap[type || ''] || 'misc';
}

function getRISType(type?: string): string {
  const typeMap: Record<string, string> = {
    'journal-article': 'JOUR',
    'book': 'BOOK',
    'book-chapter': 'CHAP',
    'dissertation': 'THES',
    'conference-paper': 'CONF',
    'proceedings': 'CONF',
    'report': 'RPRT',
    'preprint': 'UNPB',
    'dataset': 'DATA',
    'other': 'GEN'
  };
  
  return typeMap[type || ''] || 'GEN';
}

function formatBibTeXAuthors(authorships: Work['authorships']): string {
  const authors = authorships
    .map(a => a.author.display_name)
    .filter(name => name);
  
  return authors.join(' and ');
}

function escapeBibTeX(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '\\$&')
    .replace(/[&%$#_]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: string[] = [];
  
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words[position] = word;
    }
  }
  
  return words.filter(w => w).join(' ');
}