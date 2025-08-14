import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Badge, LoadingSpinner, ErrorMessage } from '@/components';
import { useHybridStorage } from '@/hooks/use-hybrid-storage';
import type { WorksParams } from '@/lib/openalex/types';
import * as styles from './saved-searches.css';

interface SavedSearch {
  id: string;
  name: string;
  params: WorksParams;
  createdAt: string;
  lastUsed?: string;
  description?: string;
  tags?: string[];
}

interface SavedSearchesProps {
  currentParams?: WorksParams;
  onLoadSearch?: (params: WorksParams) => void;
  className?: string;
}

const STORAGE_KEY = 'academic-explorer-saved-searches';

export function SavedSearches({
  currentParams,
  onLoadSearch,
  className
}: SavedSearchesProps) {
  const { get, set } = useHybridStorage();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [newSearchDescription, setNewSearchDescription] = useState('');

  // Load saved searches on component mount
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  const loadSavedSearches = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await get(STORAGE_KEY);
      setSavedSearches(stored ? JSON.parse(stored) : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
      setError('Failed to load saved searches');
    } finally {
      setLoading(false);
    }
  }, [get]);

  const saveSearch = async (name: string, description: string = '') => {
    if (!currentParams || !name.trim()) return;

    const newSearch: SavedSearch = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      description: description.trim(),
      params: currentParams,
      createdAt: new Date().toISOString(),
      tags: extractTagsFromParams(currentParams)
    };

    try {
      const updatedSearches = [...savedSearches, newSearch];
      await set(STORAGE_KEY, JSON.stringify(updatedSearches));
      setSavedSearches(updatedSearches);
      setShowSaveDialog(false);
      setNewSearchName('');
      setNewSearchDescription('');
    } catch (err) {
      console.error('Failed to save search:', err);
      setError('Failed to save search');
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      const updatedSearches = savedSearches.filter(search => search.id !== id);
      await set(STORAGE_KEY, JSON.stringify(updatedSearches));
      setSavedSearches(updatedSearches);
    } catch (err) {
      console.error('Failed to delete search:', err);
      setError('Failed to delete search');
    }
  };

  const loadSearch = async (search: SavedSearch) => {
    // Update last used timestamp
    const updatedSearch = {
      ...search,
      lastUsed: new Date().toISOString()
    };

    try {
      const updatedSearches = savedSearches.map(s => 
        s.id === search.id ? updatedSearch : s
      );
      await set(STORAGE_KEY, JSON.stringify(updatedSearches));
      setSavedSearches(updatedSearches);
    } catch (err) {
      console.error('Failed to update search timestamp:', err);
    }

    onLoadSearch?.(search.params);
  };

  const extractTagsFromParams = (params: WorksParams): string[] => {
    const tags: string[] = [];
    
    if (params.publication_year) tags.push('year-filter');
    if (params.is_oa !== undefined) tags.push('open-access');
    if (params.cited_by_count) tags.push('citations');
    if (params.has_doi !== undefined) tags.push('doi');
    if (params.type) tags.push('type-filter');
    if (params.language) tags.push('language');
    if (params.group_by) tags.push('grouped');
    
    return tags;
  };

  const formatSearchSummary = (params: WorksParams): string => {
    const parts: string[] = [];
    
    if (params.search) parts.push(`"${params.search}"`);
    if (params.filter) parts.push('with filters');
    if (params.publication_year) parts.push(`year: ${params.publication_year}`);
    if (params.is_oa) parts.push('open access');
    if (params.cited_by_count) parts.push(`min citations: ${params.cited_by_count}`);
    
    return parts.length > 0 ? parts.join(', ') : 'All works';
  };

  const canSaveCurrentSearch = () => {
    return currentParams && (currentParams.search || currentParams.filter);
  };

  if (loading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.header}>
          <Icon name="save" size="sm" />
          <h3 className={styles.title}>Saved Searches</h3>
        </div>
        <div className={styles.loading}>
          <LoadingSpinner size="sm" />
          <span>Loading saved searches...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.header}>
          <Icon name="save" size="sm" />
          <h3 className={styles.title}>Saved Searches</h3>
        </div>
        <ErrorMessage 
          title="Error" 
          message={error}
          action={
            <button onClick={loadSavedSearches} className={styles.retryButton}>
              Try Again
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Icon name="save" size="sm" />
          <h3 className={styles.title}>Saved Searches</h3>
          <Badge variant="muted" size="sm">
            {savedSearches.length}
          </Badge>
        </div>
        
        {canSaveCurrentSearch() && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className={styles.saveButton}
            title="Save current search"
          >
            <Icon name="save" size="sm" />
            <span>Save Current</span>
          </button>
        )}
      </div>

      {showSaveDialog && (
        <div className={styles.saveDialog}>
          <div className={styles.dialogContent}>
            <h4>Save Current Search</h4>
            <input
              type="text"
              placeholder="Search name"
              value={newSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              className={styles.nameInput}
              maxLength={100}
            />
            <textarea
              placeholder="Description (optional)"
              value={newSearchDescription}
              onChange={(e) => setNewSearchDescription(e.target.value)}
              className={styles.descriptionInput}
              maxLength={500}
              rows={3}
            />
            <div className={styles.dialogActions}>
              <button
                onClick={() => setShowSaveDialog(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => saveSearch(newSearchName, newSearchDescription)}
                disabled={!newSearchName.trim()}
                className={styles.confirmButton}
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}

      {savedSearches.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name="search" size="lg" />
          <h4>No saved searches yet</h4>
          <p>Save your search queries to quickly access them later.</p>
        </div>
      ) : (
        <div className={styles.searchList}>
          {savedSearches
            .sort((a, b) => new Date(b.lastUsed || b.createdAt).getTime() - new Date(a.lastUsed || a.createdAt).getTime())
            .map((search) => (
              <div key={search.id} className={styles.searchItem}>
                <div 
                  className={styles.searchContent}
                  onClick={() => loadSearch(search)}
                >
                  <div className={styles.searchHeader}>
                    <h4 className={styles.searchName}>{search.name}</h4>
                    <div className={styles.searchMeta}>
                      <span className={styles.searchDate}>
                        {search.lastUsed ? 'Used' : 'Created'} {' '}
                        {new Date(search.lastUsed || search.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {search.description && (
                    <p className={styles.searchDescription}>{search.description}</p>
                  )}
                  
                  <p className={styles.searchSummary}>
                    {formatSearchSummary(search.params)}
                  </p>
                  
                  {search.tags && search.tags.length > 0 && (
                    <div className={styles.searchTags}>
                      {search.tags.map(tag => (
                        <Badge key={tag} variant="muted" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className={styles.searchActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSearch(search);
                    }}
                    className={styles.actionButton}
                    title="Load this search"
                  >
                    <Icon name="forward" size="sm" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete search "${search.name}"?`)) {
                        deleteSearch(search.id);
                      }
                    }}
                    className={styles.deleteButton}
                    title="Delete this search"
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}