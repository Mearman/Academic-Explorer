/**
 * Component tests for enhanced QueryBuilder with visual feedback
 * Tests query validation, visual indicators, and real-time feedback
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { QueryBuilder } from './query-builder';
import type { WorksParams } from '@/lib/openalex/types';

// Mock dependencies
vi.mock('@/hooks/use-advanced-search-form', () => ({
  useAdvancedSearchForm: vi.fn(() => ({
    formData: {
      basicSearch: '',
      title: '',
      abstract: '',
      authors: '',
      authorAffiliations: '',
      venues: '',
      institutions: '',
      fromYear: '',
      toYear: '',
      hasFulltext: false,
      isOpenAccess: false,
      hasAbstract: false,
      hasOrcid: false,
      hasRor: false,
      hasDoi: false,
      citedByCountMin: '',
      citedByCountMax: '',
      conceptIds: [],
      topicIds: [],
      publisherIds: [],
      funderIds: [],
      languageCodes: [],
      locationCountries: [],
      sortBy: 'relevance_score',
      sortOrder: 'desc',
      groupBy: '',
      sample: '',
      seed: '',
      perPage: 25,
    },
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
    updateField: vi.fn(),
    handleSubmit: vi.fn(),
    handleReset: vi.fn(),
  })),
}));

vi.mock('@/components/organisms/query-history', () => ({
  QueryHistory: vi.fn(() => <div data-testid="query-history">Query History</div>),
}));

vi.mock('@/components/organisms/search-history', () => ({
  SearchHistory: vi.fn(() => <div data-testid="search-history">Search History</div>),
}));

// Mock query validation utilities
const mockQueryValidation = {
  isValid: true,
  errors: [] as { type: string; message: string; position?: number }[],
  warnings: [] as { type: string; message: string; position?: number }[],
  suggestions: [] as { type: string; message: string }[],
  complexity: 'simple' as 'simple' | 'complex' | 'advanced',
  estimatedResults: 1500,
  hasSpecialOperators: false,
  fieldTargets: [] as { field: string; coverage: number }[],
};

// Mock query validation utilities - replacing non-existent module
const mockValidateQuery = vi.fn(() => mockQueryValidation);
const mockGetQueryComplexity = vi.fn(() => 'simple');
const mockGetEstimatedResultCount = vi.fn(() => 1500);
const mockParseQueryFields = vi.fn(() => [] as { field: string; coverage: number }[]);

describe('Enhanced QueryBuilder Component', () => {
  const mockOnParamsChange = vi.fn();
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual Query Feedback', () => {
    it('should display query validation status with visual indicators', () => {
      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should display query builder header
      expect(screen.getByText('Query Builder')).toBeInTheDocument();
      expect(screen.getByText('Build powerful OpenAlex API queries with advanced filters')).toBeInTheDocument();
    });

    it('should show query complexity indicator', async () => {
      mockValidateQuery.mockReturnValue({
        ...mockQueryValidation,
        complexity: 'complex' as const,
        hasSpecialOperators: true,
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Query complexity should be indicated
      expect(screen.getByTestId('query-complexity')).toHaveTextContent('Complex');
    });

    it('should display estimated result count with confidence indicator', async () => {
      mockGetEstimatedResultCount.mockReturnValue(25000);

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show estimated results
      expect(screen.getByTestId('estimated-results')).toHaveTextContent('~25,000 results');
    });

    it('should highlight query syntax errors with specific feedback', async () => {
      mockValidateQuery.mockReturnValue({
        ...mockQueryValidation,
        isValid: false,
        errors: [
          { type: 'syntax', message: 'Unclosed quotation mark', position: 15 },
          { type: 'field', message: 'Unknown field "invalid_field"', position: 30 },
        ],
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should display error indicators
      expect(screen.getByTestId('query-errors')).toBeInTheDocument();
      expect(screen.getByText('Unclosed quotation mark')).toBeInTheDocument();
      expect(screen.getByText('Unknown field "invalid_field"')).toBeInTheDocument();
    });

    it('should show query optimization suggestions', async () => {
      mockValidateQuery.mockReturnValue({
        ...mockQueryValidation,
        suggestions: [
          { type: 'optimization', message: 'Consider using title.search for better relevance' },
          { type: 'field', message: 'Add publication year filter to narrow results' },
        ],
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should display suggestions
      expect(screen.getByTestId('query-suggestions')).toBeInTheDocument();
      expect(screen.getByText('Consider using title.search for better relevance')).toBeInTheDocument();
      expect(screen.getByText('Add publication year filter to narrow results')).toBeInTheDocument();
    });

    it('should provide real-time query preview with syntax highlighting', async () => {
      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show query preview section
      expect(screen.getByTestId('query-preview')).toBeInTheDocument();
      
      // Should highlight different parts of the query
      expect(screen.getByTestId('query-syntax-highlight')).toBeInTheDocument();
    });
  });

  describe('Interactive Query Building', () => {
    it('should provide clickable field suggestions', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show field suggestions
      const fieldSuggestions = screen.getByTestId('field-suggestions');
      expect(fieldSuggestions).toBeInTheDocument();

      // Click on a field suggestion
      const titleFieldButton = screen.getByTestId('field-suggestion-title');
      await user.click(titleFieldButton);

      // Should add field to query
      expect(mockOnParamsChange).toHaveBeenCalled();
    });

    it('should show operator suggestions based on context', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show operator buttons
      expect(screen.getByTestId('operator-suggestions')).toBeInTheDocument();
      
      // Click on AND operator
      const andOperator = screen.getByTestId('operator-and');
      await user.click(andOperator);

      // Should insert operator into query
      expect(mockOnParamsChange).toHaveBeenCalled();
    });

    it('should provide query template shortcuts', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show template buttons
      const templates = screen.getByTestId('query-templates');
      expect(templates).toBeInTheDocument();

      // Click on "Recent Papers" template
      const recentPapersTemplate = screen.getByTestId('template-recent-papers');
      await user.click(recentPapersTemplate);

      // Should populate query with template
      expect(mockOnParamsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.stringContaining('publication_year:>2020'),
        })
      );
    });

    it('should show query history with quick apply', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show query history
      expect(screen.getByTestId('query-history')).toBeInTheDocument();

      // Mock query history item
      const historyItem = screen.getByTestId('history-item-0');
      await user.click(historyItem);

      // Should apply historical query
      expect(mockOnParamsChange).toHaveBeenCalled();
    });
  });

  describe('Advanced Visual Features', () => {
    it('should display query performance metrics', async () => {
      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show performance indicators
      expect(screen.getByTestId('query-performance')).toBeInTheDocument();
      expect(screen.getByTestId('performance-speed')).toBeInTheDocument();
      expect(screen.getByTestId('performance-accuracy')).toBeInTheDocument();
    });

    it('should show query field coverage visualization', async () => {
      mockParseQueryFields.mockReturnValue([
        { field: 'title', coverage: 0.8 },
        { field: 'abstract', coverage: 0.6 },
        { field: 'publication_year', coverage: 1.0 },
      ]);

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show field coverage visualization
      expect(screen.getByTestId('field-coverage')).toBeInTheDocument();
      expect(screen.getByTestId('coverage-title')).toHaveTextContent('80%');
      expect(screen.getByTestId('coverage-abstract')).toHaveTextContent('60%');
      expect(screen.getByTestId('coverage-publication_year')).toHaveTextContent('100%');
    });

    it('should provide query diff visualization for modifications', async () => {
      const user = userEvent.setup();

      const initialData = {
        query: 'machine learning',
      };

      render(
        <QueryBuilder
          initialData={initialData}
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Modify the query
      const searchInput = screen.getByTestId('basic-search-input');
      await user.clear(searchInput);
      await user.type(searchInput, 'artificial intelligence');

      // Should show diff visualization
      expect(screen.getByTestId('query-diff')).toBeInTheDocument();
      expect(screen.getByTestId('diff-removed')).toHaveTextContent('machine learning');
      expect(screen.getByTestId('diff-added')).toHaveTextContent('artificial intelligence');
    });

    it('should display query execution plan preview', async () => {
      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show execution plan
      expect(screen.getByTestId('execution-plan')).toBeInTheDocument();
      expect(screen.getByTestId('plan-steps')).toBeInTheDocument();
      expect(screen.getByTestId('plan-optimization')).toBeInTheDocument();
    });
  });

  describe('Mobile-Optimized Query Building', () => {
    it('should provide touch-friendly query building interface', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show mobile-optimized interface
      expect(screen.getByTestId('mobile-query-builder')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-field-selector')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-operator-pad')).toBeInTheDocument();
    });

    it('should show swipeable query template carousel on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should show template carousel
      expect(screen.getByTestId('template-carousel')).toBeInTheDocument();
      expect(screen.getByTestId('carousel-indicators')).toBeInTheDocument();
    });

    it('should provide haptic feedback for query actions on mobile', async () => {
      // Mock mobile environment with haptic support
      const mockNavigator = {
        ...navigator,
        vibrate: vi.fn(),
      };
      Object.defineProperty(window, 'navigator', {
        value: mockNavigator,
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Interact with query builder
      const searchButton = screen.getByTestId('execute-search');
      await user.click(searchButton);

      // Should trigger haptic feedback
      expect(mockNavigator.vibrate).toHaveBeenCalledWith([50]);
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide screen reader announcements for query changes', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should have live region for announcements
      expect(screen.getByTestId('sr-live-region')).toBeInTheDocument();

      // Make a query change
      const searchInput = screen.getByTestId('basic-search-input');
      await user.type(searchInput, 'test query');

      // Should announce change
      expect(screen.getByTestId('sr-live-region')).toHaveTextContent(
        'Query updated. Estimated 1,500 results'
      );
    });

    it('should support keyboard navigation for all query building features', async () => {
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should support tab navigation
      await user.tab();
      expect(screen.getByTestId('basic-search-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('field-suggestion-title')).toHaveFocus();

      // Should support arrow key navigation in suggestion lists
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('field-suggestion-abstract')).toHaveFocus();
    });

    it('should provide high contrast mode support', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should apply high contrast styles
      expect(screen.getByTestId('query-builder-container')).toHaveClass('high-contrast');
    });

    it('should support reduced motion preferences', async () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Should disable animations
      expect(screen.getByTestId('query-builder-container')).toHaveClass('reduced-motion');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track query building interaction metrics', async () => {
      const user = userEvent.setup();
      const mockAnalytics = vi.fn();
      
      // Mock analytics
      (window as any).analytics = { track: mockAnalytics };

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Interact with query builder
      const fieldSuggestion = screen.getByTestId('field-suggestion-title');
      await user.click(fieldSuggestion);

      // Should track interaction
      expect(mockAnalytics).toHaveBeenCalledWith('query_builder_field_selected', {
        field: 'title',
        timestamp: expect.any(Number),
      });
    });

    it('should monitor query validation performance', async () => {
      const performanceSpy = vi.spyOn(performance, 'mark');
      const user = userEvent.setup();

      render(
        <QueryBuilder
          onParamsChange={mockOnParamsChange}
          onSearch={mockOnSearch}
          showHelp={true}
        />
      );

      // Type in search input to trigger validation
      const searchInput = screen.getByTestId('basic-search-input');
      await user.type(searchInput, 'complex query with "quotes" AND operators');

      // Should track validation performance
      expect(performanceSpy).toHaveBeenCalledWith('query_validation_start');
      expect(performanceSpy).toHaveBeenCalledWith('query_validation_end');
    });
  });
});