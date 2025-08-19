/**
 * Component tests for useAutocompleteSearch custom hook
 * Tests React hook behavior in isolation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAutocompleteSearch } from './use-autocomplete-search';

// Mock dependencies
vi.mock('@/lib/openalex/client-with-cache', () => ({
  cachedOpenAlex: {
    worksAutocomplete: vi.fn(),
    authorsAutocomplete: vi.fn(),
    sourcesAutocomplete: vi.fn(),
    institutionsAutocomplete: vi.fn(),
  },
}));

vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: vi.fn((id: string) => {
    if (id.includes('/A')) return 'author';
    if (id.includes('/W')) return 'work';
    if (id.includes('/S')) return 'source';
    if (id.includes('/I')) return 'institution';
    return null;
  }),
}));

// Mock data
const mockWorksResults = {
  results: [
    {
      id: 'https://openalex.org/W123456789',
      display_name: 'Machine Learning Research',
      cited_by_count: 150,
      hint: 'A comprehensive study',
    },
    {
      id: 'https://openalex.org/W987654321',
      display_name: 'AI in Healthcare',
      cited_by_count: 75,
    },
  ],
};

const mockAuthorsResults = {
  results: [
    {
      id: 'https://openalex.org/A123456789',
      display_name: 'Dr. Jane Smith',
      works_count: 50,
      external_ids: { orcid: '0000-0000-0000-0000' },
    },
  ],
};

const mockSourcesResults = {
  results: [
    {
      id: 'https://openalex.org/S123456789',
      display_name: 'Journal of AI Research',
      works_count: 1000,
    },
  ],
};

const mockInstitutionsResults = {
  results: [
    {
      id: 'https://openalex.org/I123456789',
      display_name: 'University of Technology',
      works_count: 5000,
    },
  ],
};

describe('useAutocompleteSearch Hook', () => {
  let mockWorksAutocomplete: ReturnType<typeof vi.fn>;
  let mockAuthorsAutocomplete: ReturnType<typeof vi.fn>;
  let mockSourcesAutocomplete: ReturnType<typeof vi.fn>;
  let mockInstitutionsAutocomplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { cachedOpenAlex } = await import('@/lib/openalex/client-with-cache');
    mockWorksAutocomplete = cachedOpenAlex.worksAutocomplete as ReturnType<typeof vi.fn>;
    mockAuthorsAutocomplete = cachedOpenAlex.authorsAutocomplete as ReturnType<typeof vi.fn>;
    mockSourcesAutocomplete = cachedOpenAlex.sourcesAutocomplete as ReturnType<typeof vi.fn>;
    mockInstitutionsAutocomplete = cachedOpenAlex.institutionsAutocomplete as ReturnType<typeof vi.fn>;
    
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      expect(result.current.query).toBe('');
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.selectedIndex).toBe(-1);
    });

    it('should accept custom configuration options', () => {
      const { result } = renderHook(() => 
        useAutocompleteSearch({
          maxSuggestions: 5,
          debounceMs: 500,
          minQueryLength: 3,
        })
      );

      expect(result.current.query).toBe('');
      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('Input Handling', () => {
    it('should update query when handleInputChange is called', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('test query');
      });

      expect(result.current.query).toBe('test query');
    });

    it('should debounce search requests', async () => {
      mockWorksAutocomplete.mockResolvedValue(mockWorksResults);
      mockAuthorsAutocomplete.mockResolvedValue(mockAuthorsResults);
      mockSourcesAutocomplete.mockResolvedValue(mockSourcesResults);
      mockInstitutionsAutocomplete.mockResolvedValue(mockInstitutionsResults);

      const { result } = renderHook(() => useAutocompleteSearch({ debounceMs: 300 }));

      act(() => {
        result.current.handleInputChange('machine');
      });

      // Should not trigger search immediately
      expect(mockWorksAutocomplete).not.toHaveBeenCalled();

      // Fast-forward time past debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'machine' });
      });
    });

    it('should cancel previous debounced search when new input arrives', () => {
      const { result } = renderHook(() => useAutocompleteSearch({ debounceMs: 300 }));

      act(() => {
        result.current.handleInputChange('first');
      });

      act(() => {
        result.current.handleInputChange('second');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only call with the latest query
      expect(mockWorksAutocomplete).toHaveBeenCalledTimes(1);
      expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'second' });
    });

    it('should not search when query is below minimum length', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ minQueryLength: 3 }));

      act(() => {
        result.current.handleInputChange('ab');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockWorksAutocomplete).not.toHaveBeenCalled();
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockWorksAutocomplete.mockResolvedValue(mockWorksResults);
      mockAuthorsAutocomplete.mockResolvedValue(mockAuthorsResults);
      mockSourcesAutocomplete.mockResolvedValue(mockSourcesResults);
      mockInstitutionsAutocomplete.mockResolvedValue(mockInstitutionsResults);
    });

    it('should search across multiple entity types', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockWorksAutocomplete).toHaveBeenCalledWith({ q: 'machine learning' });
        expect(mockAuthorsAutocomplete).toHaveBeenCalledWith({ q: 'machine learning' });
        expect(mockSourcesAutocomplete).toHaveBeenCalledWith({ q: 'machine learning' });
        expect(mockInstitutionsAutocomplete).toHaveBeenCalledWith({ q: 'machine learning' });
      });
    });

    it('should combine and sort results by relevance', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Results should be sorted by cited_by_count/works_count descending
      const {suggestions} = result.current;
      expect(suggestions[0].id).toBe('https://openalex.org/I123456789'); // Highest works_count (5000)
      expect(suggestions[1].id).toBe('https://openalex.org/S123456789'); // Next highest works_count (1000)
    });

    it('should limit results to maxSuggestions', async () => {
      const { result } = renderHook(() => useAutocompleteSearch({ maxSuggestions: 2 }));

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeLessThanOrEqual(2);
      });
    });

    it('should set loading state during search', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should open suggestions dropdown when results are found', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });
    });

    it('should handle search errors gracefully', async () => {
      mockWorksAutocomplete.mockRejectedValue(new Error('API Error'));
      mockAuthorsAutocomplete.mockRejectedValue(new Error('API Error'));
      mockSourcesAutocomplete.mockRejectedValue(new Error('API Error'));
      mockInstitutionsAutocomplete.mockRejectedValue(new Error('API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isOpen).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Autocomplete search failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      mockWorksAutocomplete.mockResolvedValue(mockWorksResults);
      mockAuthorsAutocomplete.mockResolvedValue(mockAuthorsResults);
      mockSourcesAutocomplete.mockResolvedValue(mockSourcesResults);
      mockInstitutionsAutocomplete.mockResolvedValue(mockInstitutionsResults);
    });

    it('should handle ArrowDown key to navigate suggestions', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      // Set up suggestions
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Simulate ArrowDown key
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle ArrowUp key to navigate suggestions', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      // Set up suggestions
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      // Set selected index to 1
      act(() => {
        result.current.setSelectedIndex(1);
      });

      // Simulate ArrowUp key
      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should wrap around when navigating past boundaries', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      // Set up suggestions
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      const suggestionsLength = result.current.suggestions.length;

      // Navigate to last item
      act(() => {
        result.current.setSelectedIndex(suggestionsLength - 1);
      });

      // Arrow down should wrap to first item
      const mockDownEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockDownEvent);
      });

      expect(result.current.selectedIndex).toBe(0);

      // Arrow up should wrap to last item
      const mockUpEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockUpEvent);
      });

      expect(result.current.selectedIndex).toBe(suggestionsLength - 1);
    });

    it('should handle Escape key to close suggestions', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      // Set up suggestions
      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      // Simulate Escape key
      const mockEvent = {
        key: 'Escape',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.selectedIndex).toBe(-1);
    });

    it('should ignore keyboard events when dropdown is not open', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      act(() => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(result.current.selectedIndex).toBe(-1);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Suggestion Selection', () => {
    it('should select suggestion and update query', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      const mockSuggestion = {
        id: 'https://openalex.org/A123456789',
        display_name: 'Dr. Jane Smith',
        entity_type: 'author' as const,
      };

      act(() => {
        result.current.handleSuggestionSelect(mockSuggestion);
      });

      expect(result.current.query).toBe('Dr. Jane Smith');
      expect(result.current.isOpen).toBe(false);
      expect(result.current.selectedIndex).toBe(-1);
    });
  });

  describe('Data Processing', () => {
    it('should handle malformed API responses gracefully', async () => {
      mockWorksAutocomplete.mockResolvedValue({ results: null });
      mockAuthorsAutocomplete.mockResolvedValue({});
      mockSourcesAutocomplete.mockResolvedValue({ results: [null, undefined] });
      mockInstitutionsAutocomplete.mockResolvedValue({ results: [{ invalid: 'data' }] });

      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle errors gracefully and not crash
      expect(result.current.suggestions).toEqual([]);
    });

    it('should map entity types correctly', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      const {suggestions} = result.current;
      const workSuggestion = suggestions.find(s => s.id.includes('/W'));
      const authorSuggestion = suggestions.find(s => s.id.includes('/A'));
      const sourceSuggestion = suggestions.find(s => s.id.includes('/S'));
      const institutionSuggestion = suggestions.find(s => s.id.includes('/I'));

      if (workSuggestion) expect(workSuggestion.entity_type).toBe('work');
      if (authorSuggestion) expect(authorSuggestion.entity_type).toBe('author');
      if (sourceSuggestion) expect(sourceSuggestion.entity_type).toBe('source');
      if (institutionSuggestion) expect(institutionSuggestion.entity_type).toBe('institution');
    });

    it('should preserve optional fields when present', async () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.handleInputChange('machine learning');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBeGreaterThan(0);
      });

      const workSuggestion = result.current.suggestions.find(s => s.display_name === 'Machine Learning Research');
      expect(workSuggestion?.hint).toBe('A comprehensive study');
      expect(workSuggestion?.cited_by_count).toBe(150);

      const authorSuggestion = result.current.suggestions.find(s => s.display_name === 'Dr. Jane Smith');
      expect(authorSuggestion?.external_ids).toEqual({ orcid: '0000-0000-0000-0000' });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup debounce timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { unmount } = renderHook(() => useAutocompleteSearch());

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Direct State Setters', () => {
    it('should allow direct query manipulation', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.setQuery('direct query');
      });

      expect(result.current.query).toBe('direct query');
    });

    it('should allow direct control of dropdown state', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.setIsOpen(true);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.setIsOpen(false);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should allow direct control of selected index', () => {
      const { result } = renderHook(() => useAutocompleteSearch());

      act(() => {
        result.current.setSelectedIndex(5);
      });

      expect(result.current.selectedIndex).toBe(5);
    });
  });
});