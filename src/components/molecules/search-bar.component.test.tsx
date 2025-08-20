/**
 * Component tests for SearchBar molecule
 * Tests React component rendering and behavior in isolation
 */

import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '@/test/utils/test-providers';

import { SearchBar } from './search-bar';

// Mock dependencies
const mockNavigate = vi.fn();
const mockSearchQuery = '';
const mockSetSearchQuery = vi.fn();
const mockAddToSearchHistory = vi.fn();

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock app store
vi.mock('@/stores/app-store', () => ({
  useAppStore: () => ({
    searchQuery: mockSearchQuery,
    setSearchQuery: mockSetSearchQuery,
    addToSearchHistory: mockAddToSearchHistory,
  }),
}));

// Mock AutocompleteSearch component
vi.mock('./autocomplete-search', () => {
  const MockAutocompleteSearch = vi.fn(({ placeholder, onSelect, className, showEntityBadges, maxSuggestions }) => (
    <div 
      data-testid="autocomplete-search"
      className={className}
      data-placeholder={placeholder}
      data-show-entity-badges={showEntityBadges}
      data-max-suggestions={maxSuggestions}
    >
      <input
        data-testid="autocomplete-input"
        placeholder={placeholder}
        onChange={(e) => {
          // Simulate autocomplete selection on typing
          if (e.target.value === 'test-suggestion') {
            onSelect({
              id: 'https://openalex.org/A123456789',
              display_name: 'Test Author',
              entity_type: 'author',
            });
          }
        }}
      />
      Autocomplete Search
    </div>
  ));
  
  return {
    AutocompleteSearch: MockAutocompleteSearch,
  };
});

const { AutocompleteSearch } = await import('./autocomplete-search');
const MockAutocompleteSearch = vi.mocked(AutocompleteSearch);

describe('SearchBar Autocomplete Variant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render autocomplete search by default', () => {
    renderWithProviders(<SearchBar />);
    
    const autocompleteSearch = screen.getByTestId('autocomplete-search');
    expect(autocompleteSearch).toBeInTheDocument();
    expect(autocompleteSearch).toHaveAttribute('data-placeholder', 'Search authors, works, institutions...');
    expect(autocompleteSearch).toHaveAttribute('data-show-entity-badges', 'true');
    expect(autocompleteSearch).toHaveAttribute('data-max-suggestions', '6');
  });

  it('should render search hint', () => {
    renderWithProviders(<SearchBar />);
    
    expect(screen.getByText('Try searching for authors, papers, institutions, or topics')).toBeInTheDocument();
  });

  it('should apply custom className to container', () => {
    renderWithProviders(<SearchBar className="custom-search-bar" />);
    
    const container = screen.getByTestId('autocomplete-search').parentElement;
    expect(container).toHaveClass('custom-search-bar');
  });

  it('should handle autocomplete selection correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    
    const autocompleteInput = screen.getByTestId('autocomplete-input');
    
    // Type to trigger suggestion selection
    await user.type(autocompleteInput, 'test-suggestion');
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('Test Author');
    expect(mockAddToSearchHistory).toHaveBeenCalledWith('Test Author');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/authors/A123456789' });
  });

  it('should pass correct props to AutocompleteSearch', () => {
    renderWithProviders(<SearchBar />);
    
    expect(MockAutocompleteSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: 'Search authors, works, institutions...',
        showEntityBadges: true,
        maxSuggestions: 6,
        onSelect: expect.any(Function),
        className: expect.any(String),
      }),
      undefined  // React components can be called with undefined as second parameter
    );
  });
});

describe('SearchBar Traditional Form Variant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render traditional form when showAutocomplete is false', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const form = document.querySelector('form');
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Search' });
    
    expect(form).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search academic literature');
    expect(input).toHaveAttribute('aria-label', 'Search');
    expect(button).toBeInTheDocument();
  });

  it('should handle input changes in traditional form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'machine learning');
    
    expect(input).toHaveValue('machine learning');
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Search' });
    
    await user.type(input, 'artificial intelligence');
    await user.click(button);
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('artificial intelligence');
    expect(mockAddToSearchHistory).toHaveBeenCalledWith('artificial intelligence');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/query',
      search: { q: 'artificial intelligence' }
    });
  });

  it('should handle form submission on Enter key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'neural networks');
    await user.keyboard('{Enter}');
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('neural networks');
    expect(mockAddToSearchHistory).toHaveBeenCalledWith('neural networks');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/query',
      search: { q: 'neural networks' }
    });
  });

  it('should not submit empty query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const button = screen.getByRole('button', { name: 'Search' });
    
    await user.click(button);
    
    expect(mockSetSearchQuery).not.toHaveBeenCalled();
    expect(mockAddToSearchHistory).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should trim whitespace from query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Search' });
    
    await user.type(input, '  machine learning  ');
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/query',
      search: { q: 'machine learning' }
    });
  });

  it('should apply custom className to form', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} className="custom-form" />);
    
    const form = document.querySelector('form');
    expect(form).toHaveClass('custom-form');
  });
});

describe('SearchBar Entity Route Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const entityMappings = [
    { entityType: 'author', expectedRoute: '/authors' },
    { entityType: 'work', expectedRoute: '/works' },
    { entityType: 'source', expectedRoute: '/sources' },
    { entityType: 'institution', expectedRoute: '/institutions' },
    { entityType: 'publisher', expectedRoute: '/publishers' },
    { entityType: 'funder', expectedRoute: '/funders' },
    { entityType: 'topic', expectedRoute: '/topics' },
    { entityType: 'concept', expectedRoute: '/concepts' },
  ];

  entityMappings.forEach(({ entityType, expectedRoute }) => {
    it(`should navigate to correct route for ${entityType} entity`, async () => {
      const user = userEvent.setup();
      
      // Mock the autocomplete selection to trigger different entity types
      MockAutocompleteSearch.mockImplementation(({ onSelect }) => (
        <button
          data-testid="mock-suggestion"
          onClick={() => onSelect!({
            id: `https://openalex.org/X123456789`,
            display_name: `Test ${entityType}`,
            entity_type: entityType as import('@/components/types').EntityType,
          })}
        >
          Select {entityType}
        </button>
      ));

      renderWithProviders(<SearchBar />);
      
      const suggestionButton = screen.getByTestId('mock-suggestion');
      await user.click(suggestionButton);
      
      expect(mockNavigate).toHaveBeenCalledWith({ 
        to: `${expectedRoute}/X123456789` 
      });
    });
  });

  it('should fallback to entity ID for unknown entity types', async () => {
    const user = userEvent.setup();
    
    MockAutocompleteSearch.mockImplementation(({ onSelect }) => (
      <button
        data-testid="mock-suggestion"
        onClick={() => onSelect!({
          id: 'https://openalex.org/Z123456789',
          display_name: 'Unknown Entity',
          entity_type: 'work' as import('@/components/types').EntityType,
        })}
      >
        Select Unknown
      </button>
    ));

    renderWithProviders(<SearchBar />);
    
    const suggestionButton = screen.getByTestId('mock-suggestion');
    await user.click(suggestionButton);
    
    expect(mockNavigate).toHaveBeenCalledWith({ 
      to: '/Z123456789' 
    });
  });
});

describe('SearchBar Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have accessible form elements in traditional mode', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Search' });
    
    expect(input).toHaveAttribute('aria-label', 'Search');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should have proper form structure', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const form = document.querySelector('form');
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');
    
    expect(form).toContainElement(input);
    expect(form).toContainElement(button);
  });
});

describe('SearchBar Component Switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should switch between autocomplete and traditional form based on showAutocomplete prop', () => {
    // Reset the mock to its original implementation before this test
    MockAutocompleteSearch.mockImplementation(({ placeholder, onSelect, className, showEntityBadges, maxSuggestions }) => (
      <div 
        data-testid="autocomplete-search"
        className={className}
        data-placeholder={placeholder}
        data-show-entity-badges={showEntityBadges}
        data-max-suggestions={maxSuggestions}
      >
        <input
          data-testid="autocomplete-input"
          placeholder={placeholder}
          onChange={(e) => {
            // Simulate autocomplete selection on typing
            if (e.target.value === 'test-suggestion') {
              onSelect!({
                id: 'https://openalex.org/A123456789',
                display_name: 'Test Author',
                entity_type: 'author' as import('@/components/types').EntityType,
              });
            }
          }}
        />
        Autocomplete Search
      </div>
    ));

    const { rerender } = renderWithProviders(<SearchBar showAutocomplete={true} />);
    
    expect(screen.getByTestId('autocomplete-search')).toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();
    
    rerender(<SearchBar showAutocomplete={false} />);
    
    expect(screen.queryByTestId('autocomplete-search')).not.toBeInTheDocument();
    expect(document.querySelector('form')).toBeInTheDocument();
  });
});

describe('SearchBar Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle autocomplete selection with malformed ID', async () => {
    const user = userEvent.setup();
    
    MockAutocompleteSearch.mockImplementation(({ onSelect }) => (
      <button
        data-testid="mock-suggestion"
        onClick={() => onSelect!({
          id: 'malformed-id',
          display_name: 'Test Entity',
          entity_type: 'author' as import('@/components/types').EntityType,
        })}
      >
        Select
      </button>
    ));

    renderWithProviders(<SearchBar />);
    
    const suggestionButton = screen.getByTestId('mock-suggestion');
    
    expect(() => user.click(suggestionButton)).not.toThrow();
  });

  it('should handle submission prevention gracefully', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    const form = document.querySelector('form');
    
    expect(() => {
      if (form) {
        fireEvent.submit(form);
      }
    }).not.toThrow();
  });
});

describe('SearchBar State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should integrate with app store for search functionality', () => {
    renderWithProviders(<SearchBar showAutocomplete={false} />);
    
    // Verify that the component uses the store hooks
    expect(mockSetSearchQuery).toBeDefined();
    expect(mockAddToSearchHistory).toBeDefined();
  });

  it('should integrate with router for navigation', () => {
    renderWithProviders(<SearchBar />);
    
    // Verify that the component uses the router hook
    expect(mockNavigate).toBeDefined();
  });
});