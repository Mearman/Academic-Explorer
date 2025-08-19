/**
 * Component tests for mobile search experience improvements
 * Tests touch interactions, responsive design, and mobile-specific features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock React components for testing
const MockAutocompleteSearch = ({ onSearch, placeholder }: any) => (
  <div data-testid="mobile-autocomplete">
    <input
      data-testid="mobile-search-input"
      placeholder={placeholder}
      onChange={(e) => onSearch?.(e.target.value)}
    />
    <div data-testid="mobile-suggestions" />
  </div>
);

const MockAdvancedFilters = ({ isOpen, onToggle }: any) => (
  <div data-testid="mobile-filters" style={{ display: isOpen ? 'block' : 'none' }}>
    <button data-testid="filter-toggle" onClick={onToggle}>
      Toggle Filters
    </button>
    <div data-testid="filter-content">Advanced Filters</div>
  </div>
);

const MockSearchResults = ({ results, layout }: any) => (
  <div data-testid="mobile-results" data-layout={layout}>
    {results?.map((result: any, index: number) => (
      <div key={index} data-testid={`result-${index}`}>
        {result.title}
      </div>
    ))}
  </div>
);

// Mock mobile search experience component
interface MobileSearchExperienceProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  results: any[];
  isLoading: boolean;
  viewport: 'mobile' | 'tablet' | 'desktop';
}

const MobileSearchExperience = ({
  onSearch,
  onFilterChange,
  results,
  isLoading,
  viewport,
}: MobileSearchExperienceProps) => {
  const [query, setQuery] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchMode, setSearchMode] = React.useState('simple');
  const [layout, setLayout] = React.useState('list');
  const [sortBy, setSortBy] = React.useState('relevance');
  const [lastTouchY, setLastTouchY] = React.useState(0);
  const [swipeDirection, setSwipeDirection] = React.useState(null);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    onSearch(newQuery);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setLastTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diffY = lastTouchY - currentY;
    
    if (Math.abs(diffY) > 5) {
      setSwipeDirection(diffY > 0 ? 'up' : 'down');
    }
  };

  const handleTouchEnd = () => {
    if (swipeDirection === 'up' && !showFilters) {
      setShowFilters(true);
    } else if (swipeDirection === 'down' && showFilters) {
      setShowFilters(false);
    }
    setSwipeDirection(null);
  };

  const isMobile = viewport === 'mobile';

  return (
    <div 
      data-testid="mobile-search-container"
      className={`search-experience ${viewport}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Search Header */}
      <div data-testid="search-header" className="search-header">
        <MockAutocompleteSearch
          onSearch={handleSearch}
          placeholder={isMobile ? "Search papers..." : "Search academic papers..."}
        />
        
        {/* Mobile-specific controls */}
        {isMobile && (
          <div data-testid="mobile-controls" className="mobile-controls">
            <button
              data-testid="voice-search"
              onClick={() => {/* Voice search */}}
              aria-label="Voice search"
            >
              🎤
            </button>
            
            <button
              data-testid="camera-search"
              onClick={() => {/* Camera search */}}
              aria-label="Camera search"
            >
              📷
            </button>
            
            <button
              data-testid="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
              data-active={showFilters}
            >
              🔍
            </button>
          </div>
        )}
      </div>

      {/* Search Mode Toggle */}
      <div data-testid="search-mode-toggle" className="mode-toggle">
        <button
          data-testid="simple-mode"
          onClick={() => setSearchMode('simple')}
          data-active={searchMode === 'simple'}
        >
          Simple
        </button>
        <button
          data-testid="advanced-mode"
          onClick={() => setSearchMode('advanced')}
          data-active={searchMode === 'advanced'}
        >
          Advanced
        </button>
      </div>

      {/* Quick Action Chips */}
      {isMobile && (
        <div data-testid="quick-actions" className="quick-actions">
          <button data-testid="quick-recent">Recent Papers</button>
          <button data-testid="quick-trending">Trending</button>
          <button data-testid="quick-bookmarks">Bookmarks</button>
          <button data-testid="quick-open-access">Open Access</button>
        </div>
      )}

      {/* Advanced Filters */}
      <MockAdvancedFilters
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
      />

      {/* Results Controls */}
      {results.length > 0 && (
        <div data-testid="results-controls" className="results-controls">
          <div data-testid="layout-controls">
            <button
              data-testid="layout-list"
              onClick={() => setLayout('list')}
              data-active={layout === 'list'}
            >
              ☰
            </button>
            <button
              data-testid="layout-cards"
              onClick={() => setLayout('cards')}
              data-active={layout === 'cards'}
            >
              ⊞
            </button>
            <button
              data-testid="layout-compact"
              onClick={() => setLayout('compact')}
              data-active={layout === 'compact'}
            >
              ≡
            </button>
          </div>
          
          <select
            data-testid="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="citations">Citations</option>
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div data-testid="loading-state" className="loading-state">
          <div data-testid="loading-spinner">Loading...</div>
          <div data-testid="loading-skeleton">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} data-testid={`skeleton-${i}`} className="skeleton-item" />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <MockSearchResults results={results} layout={layout} />

      {/* Mobile-specific footer */}
      {isMobile && (
        <div data-testid="mobile-footer" className="mobile-footer">
          <button data-testid="scroll-to-top">↑ Top</button>
          <button data-testid="new-search">New Search</button>
          <button data-testid="save-search">Save</button>
        </div>
      )}

      {/* Accessibility announcements */}
      <div
        data-testid="sr-announcements"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {isLoading ? `Searching for "${query}"...` : 
         results.length > 0 ? `Found ${results.length} results` : ''}
      </div>
    </div>
  );
};

// Mock React import
const React = {
  useState: vi.fn((initial) => [initial, vi.fn()]),
};

describe('Mobile Search Experience', () => {
  const mockOnSearch = vi.fn();
  const mockOnFilterChange = vi.fn();
  const mockResults = [
    { title: 'Paper 1', id: '1' },
    { title: 'Paper 2', id: '2' },
  ];

  let stateIndex = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useState for each test
    stateIndex = 0;
    const stateValues = [
      '', // query
      false, // showFilters
      'simple', // searchMode
      'list', // layout
      'relevance', // sortBy
      0, // lastTouchY
      null, // swipeDirection
    ];
    
    const setters = stateValues.map(() => vi.fn());
    
    React.useState.mockImplementation((initial) => {
      const value = stateValues[stateIndex] ?? initial;
      const setter = setters[stateIndex];
      stateIndex++;
      return [value, setter];
    });
  });

  afterEach(() => {
    stateIndex = 0;
  });

  describe('Mobile Viewport Adaptations', () => {
    it('should render mobile-optimized search interface', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('mobile-search-container')).toHaveClass('mobile');
      expect(screen.getByTestId('mobile-controls')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-footer')).toBeInTheDocument();
    });

    it('should show condensed placeholder text on mobile', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const searchInput = screen.getByTestId('mobile-search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search papers...');
    });

    it('should hide mobile-specific features on desktop', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="desktop"
        />
      );

      expect(screen.queryByTestId('mobile-controls')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quick-actions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-footer')).not.toBeInTheDocument();
    });

    it('should adapt layout for tablet viewport', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="tablet"
        />
      );

      expect(screen.getByTestId('mobile-search-container')).toHaveClass('tablet');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle swipe gestures to show/hide filters', async () => {
      const user = userEvent.setup();
      
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const container = screen.getByTestId('mobile-search-container');

      // Simulate swipe up gesture
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });
      
      fireEvent.touchMove(container, {
        touches: [{ clientY: 50 }] // Moving up
      });
      
      fireEvent.touchEnd(container);

      // Should trigger filter toggle
      await waitFor(() => {
        expect(screen.getByTestId('mobile-filters')).toHaveStyle({ display: 'block' });
      });
    });

    it('should provide haptic feedback for touch interactions', async () => {
      // Mock navigator.vibrate
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const voiceButton = screen.getByTestId('voice-search');
      await user.click(voiceButton);

      // Should trigger haptic feedback
      expect(mockVibrate).toHaveBeenCalledWith([50]);
    });

    it('should handle long press gestures for context menus', async () => {
      const user = userEvent.setup();
      
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      const firstResult = screen.getByTestId('result-0');

      // Simulate long press (touch and hold)
      fireEvent.touchStart(firstResult);
      
      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      fireEvent.touchEnd(firstResult);

      // Should show context menu
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      });
    });

    it('should detect and respond to different touch patterns', async () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const container = screen.getByTestId('mobile-search-container');

      // Test double tap
      fireEvent.touchStart(container);
      fireEvent.touchEnd(container);
      fireEvent.touchStart(container);
      fireEvent.touchEnd(container);

      // Should trigger double tap action
      await waitFor(() => {
        expect(screen.getByTestId('double-tap-action')).toBeInTheDocument();
      });
    });
  });

  describe('Voice and Camera Search', () => {
    it('should provide voice search functionality', async () => {
      // Mock Web Speech API
      const mockSpeechRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
      };
      
      Object.defineProperty(globalThis, 'webkitSpeechRecognition', {
        value: vi.fn(() => mockSpeechRecognition),
        writable: true,
        configurable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const voiceButton = screen.getByTestId('voice-search');
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    it('should handle voice search permissions gracefully', async () => {
      // Mock permission denied
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const voiceButton = screen.getByTestId('voice-search');
      await user.click(voiceButton);

      // Should show permission error
      await waitFor(() => {
        expect(screen.getByTestId('permission-error')).toBeInTheDocument();
      });
    });

    it('should enable camera search for text recognition', async () => {
      // Mock camera API
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      });

      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const cameraButton = screen.getByTestId('camera-search');
      await user.click(cameraButton);

      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
    });

    it('should display voice search visual feedback', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const voiceButton = screen.getByTestId('voice-search');
      await user.click(voiceButton);

      // Should show listening indicator
      expect(screen.getByTestId('voice-listening')).toBeInTheDocument();
      expect(screen.getByTestId('voice-waveform')).toBeInTheDocument();
    });
  });

  describe('Quick Actions and Shortcuts', () => {
    it('should provide quick action chips for common searches', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const recentButton = screen.getByTestId('quick-recent');
      await user.click(recentButton);

      expect(mockOnSearch).toHaveBeenCalledWith('recent_papers');
    });

    it('should show trending searches in quick actions', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const trendingButton = screen.getByTestId('quick-trending');
      await user.click(trendingButton);

      expect(screen.getByTestId('trending-queries')).toBeInTheDocument();
    });

    it('should provide bookmark access in quick actions', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const bookmarksButton = screen.getByTestId('quick-bookmarks');
      await user.click(bookmarksButton);

      expect(screen.getByTestId('bookmarks-list')).toBeInTheDocument();
    });

    it('should enable quick open access filter', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const openAccessButton = screen.getByTestId('quick-open-access');
      await user.click(openAccessButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({ 
        open_access: true 
      });
    });
  });

  describe('Responsive Layout Controls', () => {
    it('should provide layout switching for results', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      const cardsButton = screen.getByTestId('layout-cards');
      await user.click(cardsButton);

      expect(screen.getByTestId('mobile-results')).toHaveAttribute('data-layout', 'cards');
    });

    it('should remember layout preference across sessions', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(() => 'compact'),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
      });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('layout-compact')).toHaveAttribute('data-active', 'true');
    });

    it('should optimize layout for screen size', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', { value: 320 });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('mobile-results')).toHaveClass('small-screen');
    });

    it('should adjust sort controls for mobile', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'date');

      expect(screen.getByTestId('sort-select')).toHaveValue('date');
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript enhancements', () => {
      // Mock no JavaScript environment
      const originalAddEventListener = Element.prototype.addEventListener;
      Element.prototype.addEventListener = vi.fn();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      // Basic search should still work
      expect(screen.getByTestId('mobile-search-input')).toBeInTheDocument();

      Element.prototype.addEventListener = originalAddEventListener;
    });

    it('should handle offline scenarios gracefully', async () => {
      // Mock offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('cached-results')).toBeInTheDocument();
    });

    it('should optimize for slow network connections', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true,
      });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={true}
          viewport="mobile"
        />
      );

      // Should show optimized loading state
      expect(screen.getByTestId('slow-connection-notice')).toBeInTheDocument();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should reduce animations on low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2, // Low CPU cores
        writable: true,
      });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('mobile-search-container')).toHaveClass('reduced-animations');
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should provide proper touch targets for buttons', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      const voiceButton = screen.getByTestId('voice-search');
      const styles = getComputedStyle(voiceButton);
      
      // Touch targets should be at least 44px
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
    });

    it('should announce search state changes for screen readers', async () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={true}
          viewport="mobile"
        />
      );

      const announcements = screen.getByTestId('sr-announcements');
      expect(announcements).toHaveTextContent('Searching for ""...');
    });

    it('should provide proper ARIA labels for mobile controls', () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('voice-search')).toHaveAttribute('aria-label', 'Voice search');
      expect(screen.getByTestId('camera-search')).toHaveAttribute('aria-label', 'Camera search');
      expect(screen.getByTestId('filter-toggle')).toHaveAttribute('aria-label', 'Toggle filters');
    });

    it('should support keyboard navigation on mobile devices with keyboards', async () => {
      const user = userEvent.setup();

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      // Should be able to tab through controls
      await user.tab();
      expect(screen.getByTestId('mobile-search-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('voice-search')).toHaveFocus();
    });

    it('should handle high contrast mode preferences', () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
        writable: true,
      });

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={[]}
          isLoading={false}
          viewport="mobile"
        />
      );

      expect(screen.getByTestId('mobile-search-container')).toHaveClass('high-contrast');
    });
  });

  describe('Performance Optimization', () => {
    it('should lazy load search result images', async () => {
      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      const images = screen.getAllByTestId(/result-image/);
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should implement virtual scrolling for large result sets', async () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        title: `Paper ${i}`,
        id: String(i),
      }));

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={largeResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      // Should only render visible items
      const renderedResults = screen.getAllByTestId(/^result-/);
      expect(renderedResults.length).toBeLessThan(20); // Virtual window
    });

    it('should prefetch likely next actions', async () => {
      const mockPrefetch = vi.fn();
      global.fetch = mockPrefetch;

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      // Should prefetch filters when search starts
      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalledWith('/api/filters', expect.any(Object));
      });
    });

    it('should implement efficient scroll position restoration', async () => {
      const mockScrollTo = vi.fn();
      window.scrollTo = mockScrollTo;

      render(
        <MobileSearchExperience
          onSearch={mockOnSearch}
          onFilterChange={mockOnFilterChange}
          results={mockResults}
          isLoading={false}
          viewport="mobile"
        />
      );

      // Navigate away and back
      window.dispatchEvent(new Event('beforeunload'));
      window.dispatchEvent(new Event('load'));

      expect(mockScrollTo).toHaveBeenCalledWith(0, expect.any(Number));
    });
  });
});