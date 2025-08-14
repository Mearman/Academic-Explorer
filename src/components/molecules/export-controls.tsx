import React, { useState } from 'react';
import { Icon, LoadingSpinner } from '@/components';
import { formatCitation } from '@/lib/openalex/utils/transformers';
import type { Work } from '@/lib/openalex/types';
import * as styles from './export-controls.css';

interface ExportControlsProps {
  results: Work[];
  totalResults?: number;
  searchQuery?: string;
  onExport?: (format: string, count: number) => void;
  className?: string;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  icon: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: 'json',
    name: 'JSON',
    extension: 'json',
    description: 'Raw OpenAlex data in JSON format',
    icon: 'download'
  },
  {
    id: 'csv',
    name: 'CSV',
    extension: 'csv',
    description: 'Tabular data for spreadsheet applications',
    icon: 'download'
  },
  {
    id: 'bibtex',
    name: 'BibTeX',
    extension: 'bib',
    description: 'Bibliography format for LaTeX documents',
    icon: 'download'
  },
  {
    id: 'ris',
    name: 'RIS',
    extension: 'ris',
    description: 'Research Information Systems format',
    icon: 'download'
  },
  {
    id: 'apa',
    name: 'APA Citations',
    extension: 'txt',
    description: 'Formatted citations in APA style',
    icon: 'download'
  },
  {
    id: 'mla',
    name: 'MLA Citations',
    extension: 'txt',
    description: 'Formatted citations in MLA style',
    icon: 'download'
  }
];

export function ExportControls({
  results,
  totalResults = 0,
  searchQuery = '',
  onExport,
  className
}: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  const generateFilename = (format: ExportFormat) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const queryPart = searchQuery 
      ? searchQuery.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
      : 'search_results';
    return `${queryPart}_${timestamp}.${format.extension}`;
  };

  const exportToJson = (data: Work[]) => {
    return JSON.stringify({
      meta: {
        count: data.length,
        total: totalResults,
        query: searchQuery,
        exported_at: new Date().toISOString(),
        source: 'Academic Explorer - OpenAlex API'
      },
      results: data
    }, null, 2);
  };

  const exportToCsv = (data: Work[]) => {
    if (data.length === 0) return '';

    // Extract common fields for CSV
    const headers = [
      'id',
      'title',
      'type',
      'publication_date',
      'cited_by_count',
      'authors',
      'source',
      'doi',
      'open_access',
      'url'
    ];

    const rows = data.map(item => {
      return headers.map(header => {
        switch (header) {
          case 'title':
            return `"${(item.display_name || item.title || '').replace(/"/g, '""')}"`;
          case 'type':
            return item.type || item.entity_type || '';
          case 'authors':
            if (item.authorships) {
              return `"${item.authorships.map(a => a.author?.display_name).filter(Boolean).join('; ')}"`;
            }
            return '';
          case 'source':
            return item.primary_location?.source?.display_name || 
                   item.host_organization?.display_name ||
                   item.source?.display_name || '';
          case 'open_access':
            return item.open_access?.oa_date ? 'Yes' : 'No';
          case 'url':
            return item.primary_location?.landing_page_url || item.landing_page_url || '';
          default:
            return item[header] || '';
        }
      });
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const exportToBibtex = (data: Work[]) => {
    return data.map(item => {
      if (item.type !== 'article' && !item.authorships) return null;

      const authors = item.authorships 
        ? item.authorships.map(a => a.author?.display_name).filter(Boolean).join(' and ')
        : '';
      
      const year = item.publication_date ? new Date(item.publication_date).getFullYear() : '';
      const title = item.display_name || item.title || '';
      const journal = item.primary_location?.source?.display_name || '';
      const doi = item.doi ? item.doi.replace('https://doi.org/', '') : '';
      
      const id = item.id?.split('/').pop() || Math.random().toString(36).substr(2, 9);

      return `@article{${id},
  title={${title}},
  author={${authors}},
  journal={${journal}},
  year={${year}},${doi ? `\n  doi={${doi}},` : ''}
  url={${item.primary_location?.landing_page_url || ''}}
}`;
    }).filter(Boolean).join('\n\n');
  };

  const exportToRis = (data: Work[]) => {
    return data.map(item => {
      if (!item.authorships) return null;

      const lines = ['TY  - JOUR']; // Journal article type
      
      if (item.display_name || item.title) {
        lines.push(`TI  - ${item.display_name || item.title}`);
      }
      
      if (item.authorships) {
        item.authorships.forEach(authorship => {
          if (authorship.author?.display_name) {
            lines.push(`AU  - ${authorship.author.display_name}`);
          }
        });
      }
      
      if (item.publication_date) {
        lines.push(`PY  - ${new Date(item.publication_date).getFullYear()}`);
      }
      
      if (item.primary_location?.source?.display_name) {
        lines.push(`JO  - ${item.primary_location.source.display_name}`);
      }
      
      if (item.doi) {
        lines.push(`DO  - ${item.doi.replace('https://doi.org/', '')}`);
      }
      
      if (item.primary_location?.landing_page_url) {
        lines.push(`UR  - ${item.primary_location.landing_page_url}`);
      }
      
      lines.push('ER  - ');
      
      return lines.join('\n');
    }).filter(Boolean).join('\n\n');
  };

  const exportToCitations = (data: Work[], style: 'apa' | 'mla') => {
    return data.map((item, index) => {
      const citation = formatCitation(item, { style });
      
      return `${index + 1}. ${citation}`;
    }).join('\n\n');
  };

  const handleExport = async (format: ExportFormat) => {
    if (results.length === 0) return;

    setIsExporting(true);
    setSelectedFormat(format.id);

    try {
      let content: string;
      let mimeType: string;

      switch (format.id) {
        case 'json':
          content = exportToJson(results);
          mimeType = 'application/json';
          break;
        case 'csv':
          content = exportToCsv(results);
          mimeType = 'text/csv';
          break;
        case 'bibtex':
          content = exportToBibtex(results);
          mimeType = 'text/plain';
          break;
        case 'ris':
          content = exportToRis(results);
          mimeType = 'text/plain';
          break;
        case 'apa':
          content = exportToCitations(results, 'apa');
          mimeType = 'text/plain';
          break;
        case 'mla':
          content = exportToCitations(results, 'mla');
          mimeType = 'text/plain';
          break;
        default:
          throw new Error(`Unsupported export format: ${format.id}`);
      }

      // Create and trigger download
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFilename(format);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExport?.(format.id, results.length);
    } catch (error) {
      console.error('Export failed:', error);
      // Could show toast notification here
    } finally {
      setIsExporting(false);
      setSelectedFormat('');
    }
  };

  if (results.length === 0) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.emptyState}>
          <Icon name="info" size="sm" />
          <span>No results to export</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <div className={styles.info}>
          <Icon name="download" size="sm" />
          <span className={styles.count}>
            Export {results.length} results
            {totalResults > results.length && (
              <span className={styles.total}> of {totalResults.toLocaleString()}</span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.formats}>
        {exportFormats.map(format => (
          <button
            key={format.id}
            onClick={() => handleExport(format)}
            disabled={isExporting}
            className={`${styles.formatButton} ${
              isExporting && selectedFormat === format.id ? styles.formatButtonLoading : ''
            }`}
            title={format.description}
          >
            {isExporting && selectedFormat === format.id ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Icon name="download" size="sm" />
            )}
            
            <div className={styles.formatInfo}>
              <span className={styles.formatName}>{format.name}</span>
              <span className={styles.formatDesc}>{format.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}