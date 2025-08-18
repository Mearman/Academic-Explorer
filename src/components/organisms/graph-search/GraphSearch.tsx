import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@/components';
import type { EntityGraphVertex, EntityType } from '@/types/entity-graph';
import * as styles from '../entity-graph-visualization.css';

interface GraphSearchProps {
  vertices: EntityGraphVertex[];
  onVertexSelect: (vertex: EntityGraphVertex | null) => void;
  selectedVertexId?: string | null;
  isVisible: boolean;
  onClose: () => void;
  onHighlightVertices?: (vertexIds: string[]) => void;
}

interface SearchResult {
  vertex: EntityGraphVertex;
  score: number;
  matchType: 'name' | 'type' | 'metadata';
}

function searchVertices(vertices: EntityGraphVertex[], query: string): SearchResult[] {
  if (!query.trim()) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];
  
  for (const vertex of vertices) {
    let score = 0;
    let matchType: SearchResult['matchType'] = 'name';
    
    // Name matching (highest priority)
    const displayNameLower = vertex.displayName.toLowerCase();
    if (displayNameLower.includes(queryLower)) {
      if (displayNameLower.startsWith(queryLower)) {
        score = 100; // Perfect prefix match
      } else {
        score = 80; // Contains match
      }
      matchType = 'name';
    }
    
    // Entity type matching
    else if (vertex.entityType.toLowerCase().includes(queryLower)) {
      score = 60;
      matchType = 'type';
    }
    
    // Metadata matching (URL, ID, etc.)
    else if (vertex.metadata.url?.toLowerCase().includes(queryLower) ||
             vertex.id.toLowerCase().includes(queryLower)) {
      score = 40;
      matchType = 'metadata';
    }
    
    if (score > 0) {
      results.push({ vertex, score, matchType });
    }
  }
  
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

export function GraphSearch({
  vertices,
  onVertexSelect,
  selectedVertexId,
  isVisible,
  onClose,
  onHighlightVertices,
}: GraphSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update search results when query changes
  const updateResults = useCallback((searchQuery: string) => {
    const searchResults = searchVertices(vertices, searchQuery);
    setResults(searchResults);
    setSelectedIndex(-1);
    
    // Highlight matching vertices
    onHighlightVertices?.(searchResults.map(r => r.vertex.id));
  }, [vertices, onHighlightVertices]);
  
  useEffect(() => {
    updateResults(query);
  }, [query, updateResults]);
  
  // Focus input when search becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
        
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onVertexSelect(results[selectedIndex].vertex);
          onClose();
        }
        break;
    }
  }, [onClose, results, selectedIndex, onVertexSelect]);
  
  const handleResultClick = useCallback((vertex: EntityGraphVertex) => {
    onVertexSelect(vertex);
    onClose();
  }, [onVertexSelect, onClose]);
  
  const getMatchTypeIcon = (matchType: SearchResult['matchType']): string => {
    switch (matchType) {
      case 'name': return 'user';
      case 'type': return 'category';
      case 'metadata': return 'link';
      default: return 'search';
    }
  };
  
  const getEntityTypeColor = (entityType: EntityType): string => {
    // This should match the colors from your existing design system
    const colorMap: Partial<Record<EntityType, string>> = {
      work: '#3b82f6',
      author: '#ef4444',
      source: '#10b981',
      institution: '#f59e0b',
      publisher: '#8b5cf6',
      funder: '#06b6d4',
      topic: '#84cc16',
      concept: '#6b7280',
    };
    return colorMap[entityType] || '#6b7280';
  };
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className={styles.searchOverlay}
      role="dialog"
      aria-label="Graph search"
      aria-modal="true"
    >
      <div className={styles.searchContainer}>
        <div className={styles.searchInputContainer}>
          <Icon name="search" size="sm" className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search vertices by name, type, or ID..."
            className={styles.searchInput}
            aria-label="Search graph vertices"
            aria-describedby="search-results"
          />
          <button
            onClick={onClose}
            className={styles.searchCloseButton}
            title="Close search (Escape)"
            aria-label="Close search"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
        
        {query && (
          <div 
            id="search-results"
            className={styles.searchResults}
            role="listbox"
            aria-label="Search results"
          >
            {results.length > 0 ? (
              <>
                <div className={styles.searchResultsHeader}>
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                {results.map((result, index) => (
                  <div
                    key={result.vertex.id}
                    className={`${styles.searchResult} ${
                      index === selectedIndex ? styles.searchResultSelected : ''
                    } ${
                      result.vertex.id === selectedVertexId ? styles.searchResultActive : ''
                    }`}
                    onClick={() => handleResultClick(result.vertex)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    aria-label={`Select ${result.vertex.displayName}, ${result.vertex.entityType}`}
                  >
                    <div className={styles.searchResultHeader}>
                      <div className={styles.searchResultInfo}>
                        <Icon 
                          name={getMatchTypeIcon(result.matchType)} 
                          size="sm" 
                          className={styles.searchResultIcon}
                        />
                        <span className={styles.searchResultName}>
                          {result.vertex.displayName}
                        </span>
                      </div>
                      <div 
                        className={styles.searchResultType}
                        style={{ color: getEntityTypeColor(result.vertex.entityType) }}
                      >
                        {result.vertex.entityType}
                      </div>
                    </div>
                    
                    <div className={styles.searchResultMeta}>
                      {result.vertex.directlyVisited && (
                        <span className={styles.searchResultBadge}>
                          Visited {result.vertex.visitCount}x
                        </span>
                      )}
                      {result.matchType === 'metadata' && (
                        <span className={styles.searchResultBadge}>
                          ID match
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.searchNoResults}>
                <Icon name="search" size="md" />
                <p>No vertices found for "{query}"</p>
                <p className={styles.searchHint}>
                  Try searching by name, entity type, or ID
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}