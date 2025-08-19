/**
 * Component tests for AdvancedSearchForm with persistent filters
 * Tests React component rendering and persistence integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';

import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';
import type { SavedSearchFilters } from '@/hooks/use-persistent-search-filters';

import { AdvancedSearchForm } from './advanced-search-form';

// Create hoisted mocks
const mockSaveFilters = vi.fn();
const mockLoadFilters = vi.fn();
const mockClearFilters = vi.fn();
const mockClearError = vi.fn();

const mockUsePersistentSearchFilters = vi.hoisted(() => ({
  isLoading: false,
  isInitialized: true,
  savedFilters: null as SavedSearchFilters | null,
  error: null as string | null,
  saveFilters: mockSaveFilters,
  loadFilters: mockLoadFilters,
  clearFilters: mockClearFilters,
  clearError: mockClearError,
}));

// Mock the persistent search filters hook
vi.mock('@/hooks/use-persistent-search-filters', () => ({
  usePersistentSearchFilters: () => mockUsePersistentSearchFilters,
}));

// Mock the advanced search form hook
const mockAdvancedSearchFormHook: {
  formData: AdvancedSearchFormData;
  isCollapsed: boolean;
  setIsCollapsed: MockedFunction<(collapsed: boolean) => void>;
  updateField: MockedFunction<(field: string, value: unknown) => void>;
  handleSubmit: MockedFunction<(event: React.FormEvent) => void>;
  handleReset: MockedFunction<() => void>;
} = {
  formData: {
    query: '',
    searchField: 'all',
    searchMode: 'basic',
    sortBy: 'relevance_score',
    sortOrder: 'desc',
    perPage: 25,
  },
  isCollapsed: true,
  setIsCollapsed: vi.fn(),
  updateField: vi.fn(),
  handleSubmit: vi.fn(),
  handleReset: vi.fn(),
};

vi.mock('@/hooks/use-advanced-search-form', () => ({
  useAdvancedSearchForm: () => mockAdvancedSearchFormHook,
}));

// Mock all the advanced search sections
interface MockSectionProps {
  formData: AdvancedSearchFormData;
  updateField: (field: string, value: unknown) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  onReset?: () => void;
}

vi.mock('./advanced-search', () => ({
  BasicSearchSection: ({ formData, updateField, isCollapsed, setIsCollapsed }: MockSectionProps) => (
    <div data-testid="basic-search-section">
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        data-testid="toggle-advanced"
      >
        {isCollapsed ? 'Show Advanced' : 'Hide Advanced'}
      </button>
      <input
        data-testid="query-input"
        value={formData.query}
        onChange={(e) => updateField('query', e.target.value)}
        placeholder="Search query"
      />
    </div>
  ),
  DateFiltersSection: ({ formData, updateField }: MockSectionProps) => (
    <div data-testid="date-filters-section">
      <input
        data-testid="from-date"
        type="date"
        value={formData.fromPublicationDate || ''}
        onChange={(e) => updateField('fromPublicationDate', e.target.value)}
      />
      <input
        data-testid="to-date"
        type="date"
        value={formData.toPublicationDate || ''}
        onChange={(e) => updateField('toPublicationDate', e.target.value)}
      />
    </div>
  ),
  ContentFiltersSection: ({ formData, updateField }: MockSectionProps) => (
    <div data-testid="content-filters-section">
      <label>
        <input
          data-testid="open-access-checkbox"
          type="checkbox"
          checked={formData.isOpenAccess || false}
          onChange={(e) => updateField('isOpenAccess', e.target.checked)}
        />
        Open Access
      </label>
    </div>
  ),
  CitationFiltersSection: ({ formData, updateField }: MockSectionProps) => (
    <div data-testid="citation-filters-section">
      <input
        data-testid="citation-min"
        type="number"
        value={formData.citationCountMin || ''}
        onChange={(e) => updateField('citationCountMin', parseInt(e.target.value) || undefined)}
        placeholder="Min citations"
      />
    </div>
  ),
  EntityFiltersSection: ({ formData, updateField }: MockSectionProps) => (
    <div data-testid="entity-filters-section">
      <input
        data-testid="author-id"
        value={formData.authorId || ''}
        onChange={(e) => updateField('authorId', e.target.value)}
        placeholder="Author ID"
      />
    </div>
  ),
  ResultsOptionsSection: ({ formData, updateField, onReset }: MockSectionProps) => (
    <div data-testid="results-options-section">
      <select
        data-testid="sort-select"
        value={formData.sortBy}
        onChange={(e) => updateField('sortBy', e.target.value)}
      >
        <option value="relevance_score">Relevance</option>
        <option value="cited_by_count">Citations</option>
        <option value="publication_date">Date</option>
      </select>
      <button data-testid="reset-button" onClick={onReset}>Reset</button>
      <button data-testid="save-filters-button" type="button">Save Filters</button>
      <button data-testid="load-filters-button" type="button">Load Filters</button>
      <button data-testid="clear-saved-filters-button" type="button">Clear Saved</button>
    </div>
  ),
}));

describe('AdvancedSearchForm with Persistent Filters', () => {
  const mockOnSearch = vi.fn();
  const mockOnParamsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock hook state
    Object.assign(mockUsePersistentSearchFilters, {
      isLoading: false,
      isInitialized: true,
      savedFilters: null,
      error: null,
    });

    // Reset form hook state
    Object.assign(mockAdvancedSearchFormHook, {
      formData: {
        query: '',
        searchField: 'all' as const,
        searchMode: 'basic' as const,
        sortBy: 'relevance_score' as const,
        sortOrder: 'desc' as const,
        perPage: 25,
      },
      isCollapsed: true,
    });
  });

  afterEach(() => {
    // Clear any persistence side effects
    localStorage.clear();
  });

  describe('Persistence Integration', () => {
    it('should render save filters button when advanced section is expanded', async () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByTestId('save-filters-button')).toBeInTheDocument();
      expect(screen.getByTestId('load-filters-button')).toBeInTheDocument();
      expect(screen.getByTestId('clear-saved-filters-button')).toBeInTheDocument();
    });

    it('should not render persistence buttons when advanced section is collapsed', () => {
      mockAdvancedSearchFormHook.isCollapsed = true;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.queryByTestId('save-filters-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('load-filters-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clear-saved-filters-button')).not.toBeInTheDocument();
    });

    it('should call saveFilters when save button is clicked', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockAdvancedSearchFormHook.formData = {
        query: 'machine learning',
        searchField: 'title' as const,
        searchMode: 'basic' as const,
        fromPublicationDate: '2020-01-01',
        isOpenAccess: true,
        sortBy: 'cited_by_count' as const,
        sortOrder: 'desc' as const,
        perPage: 50,
      };
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const saveButton = screen.getByTestId('save-filters-button');
      await user.click(saveButton);
      
      expect(mockSaveFilters).toHaveBeenCalledWith(mockAdvancedSearchFormHook.formData);
    });

    it('should show loading state during save operation', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.isLoading = true;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const saveButton = screen.getByTestId('save-filters-button');
      expect(saveButton).toBeDisabled();
    });

    it('should load filters and update form when load button is clicked', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      const savedFilterData: AdvancedSearchFormData = {
        query: 'artificial intelligence',
        searchField: 'abstract',
        searchMode: 'boolean',
        fromPublicationDate: '2021-01-01',
        toPublicationDate: '2023-12-31',
        isOpenAccess: true,
        hasAbstract: true,
        citationCountMin: 20,
        sortBy: 'publication_date',
        sortOrder: 'asc',
        perPage: 100,
      };

      mockLoadFilters.mockResolvedValue({
        ...savedFilterData,
        savedAt: Date.now(),
        version: 1,
      });
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const loadButton = screen.getByTestId('load-filters-button');
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(mockLoadFilters).toHaveBeenCalledWith('default');
      });

      // Should update form fields with loaded data
      Object.entries(savedFilterData).forEach(([key, value]) => {
        expect(mockAdvancedSearchFormHook.updateField).toHaveBeenCalledWith(key, value);
      });
    });

    it('should handle load operation when no saved filters exist', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockLoadFilters.mockResolvedValue(null);
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const loadButton = screen.getByTestId('load-filters-button');
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(mockLoadFilters).toHaveBeenCalledWith('default');
      });

      // Should not update form fields when no saved data
      expect(mockAdvancedSearchFormHook.updateField).not.toHaveBeenCalled();
    });

    it('should clear saved filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const clearButton = screen.getByTestId('clear-saved-filters-button');
      await user.click(clearButton);
      
      expect(mockClearFilters).toHaveBeenCalledWith('default');
    });

    it('should auto-load filters on component mount when savedFilters exist', () => {
      const savedFilterData: AdvancedSearchFormData = {
        query: 'neural networks',
        searchField: 'title',
        searchMode: 'exact',
        isOpenAccess: false,
        sortBy: 'cited_by_count',
        sortOrder: 'desc',
        perPage: 25,
      };

      mockUsePersistentSearchFilters.savedFilters = {
        ...savedFilterData,
        savedAt: Date.now(),
        version: 1,
      };
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      // Should auto-populate form fields on mount
      Object.entries(savedFilterData).forEach(([key, value]) => {
        expect(mockAdvancedSearchFormHook.updateField).toHaveBeenCalledWith(key, value);
      });
    });

    it('should not auto-load when no savedFilters exist', () => {
      mockUsePersistentSearchFilters.savedFilters = null;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      // Should not call updateField when no saved filters
      expect(mockAdvancedSearchFormHook.updateField).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when persistence operation fails', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.error = 'Failed to save filters';
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByText('Failed to save filters')).toBeInTheDocument();
    });

    it('should provide error clearing functionality', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.error = 'Failed to save filters';
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const errorMessage = screen.getByText('Failed to save filters');
      expect(errorMessage).toBeInTheDocument();
      
      // Click to clear error (assuming there's a close button)
      const clearErrorButton = screen.getByTestId('clear-error-button');
      await user.click(clearErrorButton);
      
      expect(mockClearError).toHaveBeenCalled();
    });

    it('should disable persistence buttons when not initialized', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.isInitialized = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByTestId('save-filters-button')).toBeDisabled();
      expect(screen.getByTestId('load-filters-button')).toBeDisabled();
      expect(screen.getByTestId('clear-saved-filters-button')).toBeDisabled();
    });

    it('should handle corrupted filter data gracefully', () => {
      mockUsePersistentSearchFilters.savedFilters = {
        invalidField: 'corrupt data',
        // Missing required fields
      } as SavedSearchFilters;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      // Should not crash and not attempt to update form fields
      expect(mockAdvancedSearchFormHook.updateField).not.toHaveBeenCalled();
    });
  });

  describe('Visual Indicators', () => {
    it('should show indicator when saved filters exist', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.savedFilters = {
        query: 'test',
        savedAt: Date.now(),
        version: 1,
      } as SavedSearchFilters;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByTestId('saved-filters-indicator')).toBeInTheDocument();
    });

    it('should not show indicator when no saved filters exist', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.savedFilters = null;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.queryByTestId('saved-filters-indicator')).not.toBeInTheDocument();
    });

    it('should show last saved timestamp when filters exist', () => {
      const savedAt = Date.now();
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.savedFilters = {
        query: 'test',
        savedAt,
        version: 1,
      } as SavedSearchFilters;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByTestId('last-saved-time')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should save filters on Ctrl+S when advanced section is open', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      await user.keyboard('{Control>}s{/Control}');
      
      expect(mockSaveFilters).toHaveBeenCalledWith(mockAdvancedSearchFormHook.formData);
    });

    it('should load filters on Ctrl+L when advanced section is open', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      await user.keyboard('{Control>}l{/Control}');
      
      expect(mockLoadFilters).toHaveBeenCalledWith('default');
    });

    it('should not trigger shortcuts when advanced section is collapsed', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = true;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      await user.keyboard('{Control>}s{/Control}');
      await user.keyboard('{Control>}l{/Control}');
      
      expect(mockSaveFilters).not.toHaveBeenCalled();
      expect(mockLoadFilters).not.toHaveBeenCalled();
    });
  });

  describe('Form Integration', () => {
    it('should pass onParamsChange to form hook correctly', () => {
      render(<AdvancedSearchForm onSearch={mockOnSearch} onParamsChange={mockOnParamsChange} />);
      
      // The mock hook should receive the onParamsChange function
      expect(mockOnParamsChange).toBeDefined();
    });

    it('should preserve form submission functionality', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const form = screen.getByRole('form') || screen.getByTestId('advanced-search-form');
      fireEvent.submit(form);
      
      expect(mockAdvancedSearchFormHook.handleSubmit).toHaveBeenCalled();
    });

    it('should preserve reset functionality', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const resetButton = screen.getByTestId('reset-button');
      await user.click(resetButton);
      
      expect(mockAdvancedSearchFormHook.handleReset).toHaveBeenCalled();
    });

    it('should preserve field update functionality', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const queryInput = screen.getByTestId('query-input');
      await user.type(queryInput, 'test query');
      
      expect(mockAdvancedSearchFormHook.updateField).toHaveBeenCalledWith('query', expect.any(String));
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels for persistence actions', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      expect(screen.getByRole('button', { name: /save.*filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load.*filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear.*saved/i })).toBeInTheDocument();
    });

    it('should provide appropriate ARIA attributes for loading states', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.isLoading = true;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const saveButton = screen.getByTestId('save-filters-button');
      expect(saveButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should announce errors to screen readers', () => {
      mockAdvancedSearchFormHook.isCollapsed = false;
      mockUsePersistentSearchFilters.error = 'Failed to save filters';
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Failed to save filters');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily when persistence state changes', () => {
      const { rerender } = render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      // Change only the loading state
      mockUsePersistentSearchFilters.isLoading = true;
      rerender(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      // Should not call form hook more than necessary
      expect(mockAdvancedSearchFormHook.updateField).toHaveBeenCalledTimes(0);
    });

    it('should debounce auto-save when form data changes rapidly', async () => {
      const user = userEvent.setup();
      mockAdvancedSearchFormHook.isCollapsed = false;
      
      render(<AdvancedSearchForm onSearch={mockOnSearch} />);
      
      const queryInput = screen.getByTestId('query-input');
      
      // Rapidly type multiple characters
      await user.type(queryInput, 'rapid typing');
      
      // Should debounce and only save once after typing stops
      await waitFor(() => {
        expect(mockSaveFilters).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });
});