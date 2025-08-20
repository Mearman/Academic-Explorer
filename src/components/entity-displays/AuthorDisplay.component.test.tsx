/**
 * Component tests for AuthorDisplay entity display component
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { Author } from '@/lib/openalex/types';

import { AuthorDisplay } from './AuthorDisplay';

// Mock component prop types for proper TypeScript support
interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface MockBadgeProps extends MockComponentProps {
  variant?: string;
  color?: string;
  size?: string;
}

interface MockTextProps extends MockComponentProps {
  size?: string;
  fw?: string | number;
  c?: string;
}

interface MockTitleProps extends MockComponentProps {
  order?: number;
  size?: string;
}

interface MockAnchorProps extends MockComponentProps {
  href?: string;
}

interface MockPaperProps extends MockComponentProps {
  p?: string | number;
  withBorder?: boolean;
  radius?: string;
  bg?: string;
  style?: React.CSSProperties | ((theme: unknown) => React.CSSProperties);
}

interface MockGridColProps extends MockComponentProps {
  span?: unknown;
}

interface MockTabsProps extends MockComponentProps {
  defaultValue?: string;
}

interface MockTabProps extends MockComponentProps {
  value?: string;
  leftSection?: React.ReactNode;
}

interface MockTabsPanelProps extends MockComponentProps {
  value?: string;
}

interface MockTimelineItemProps extends MockComponentProps {
  title?: string;
}

interface MockSelectProps extends MockComponentProps {
  data?: Array<{value: string; label: string}>;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface MockInputProps extends MockComponentProps {
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface MockButtonProps extends MockComponentProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

interface MockAlertProps extends MockComponentProps {
  title?: string;
}

interface MockLinkProps extends MockComponentProps {
  to?: string;
}

interface MockRawDataViewProps extends MockComponentProps {
  data?: unknown;
  title?: string;
  entityType?: string;
  entityId?: string;
}

interface MockEntityLinkProps extends MockComponentProps {
  entityId?: string;
  displayName?: string;
  size?: string;
  weight?: string | number;
}

interface MockWorksTimelineProps extends MockComponentProps {
  authorId?: string;
  authorName?: string;
}

// Mock external dependencies
vi.mock('@mantine/core', () => ({
  Card: ({ children, ...props }: MockComponentProps) => <div data-testid="card" {...props}>{children}</div>,
  Badge: ({ children, variant, color, size, ...props }: MockBadgeProps) => (
    <span data-testid="badge" data-variant={variant} data-color={color} data-size={size} {...props}>
      {children}
    </span>
  ),
  Group: ({ children, ...props }: MockComponentProps) => <div data-testid="group" {...props}>{children}</div>,
  Stack: ({ children, ...props }: MockComponentProps) => <div data-testid="stack" {...props}>{children}</div>,
  Text: ({ children, size, fw, c, ...props }: MockTextProps) => (
    <span data-testid="text" data-size={size} data-fw={fw} data-c={c} {...props}>
      {children}
    </span>
  ),
  Title: ({ children, order, size, ...props }: MockTitleProps) => (
    <h1 data-testid="title" data-order={order} data-size={size} {...props}>
      {children}
    </h1>
  ),
  Anchor: ({ children, href, ...props }: MockAnchorProps) => (
    <a data-testid="anchor" href={href} {...props}>
      {children}
    </a>
  ),
  Paper: ({ children, p, withBorder, radius, bg, style, ...props }: MockPaperProps) => {
    // Handle function-based styles by calling with a mock theme
    const mockTheme = {
      shadows: { md: '0 4px 8px rgba(0,0,0,0.1)' },
      colors: {
        blue: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab', '#0b4d8a'],
        green: ['#ebfbee', '#d3f9d8', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e'],
        gray: ['#f8f9fa', '#f1f3f4', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529'],
        indigo: ['#edf2ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3730a3']
      }
    };
    const resolvedStyle = typeof style === 'function' 
      ? style(mockTheme)
      : style;
    
    return (
      <div 
        data-testid="paper" 
        data-p={p} 
        data-with-border={withBorder} 
        data-radius={radius} 
        data-bg={bg} 
        style={resolvedStyle}
        {...props}
      >
        {children}
      </div>
    );
  },
  Grid: Object.assign(
    ({ children, ...props }: MockComponentProps) => <div data-testid="grid" {...props}>{children}</div>,
    {
      Col: ({ children, span, ...props }: MockGridColProps) => (
        <div data-testid="grid-col" data-span={JSON.stringify(span)} {...props}>
          {children}
        </div>
      ),
    }
  ),
  Tabs: Object.assign(
    ({ children, defaultValue, ...props }: MockTabsProps) => (
      <div data-testid="tabs" data-default-value={defaultValue} {...props}>
        {children}
      </div>
    ),
    {
      List: ({ children, ...props }: MockComponentProps) => <div data-testid="tabs-list" {...props}>{children}</div>,
      Tab: ({ children, value, leftSection, ...props }: MockTabProps) => (
        <button data-testid="tabs-tab" data-value={value} {...props}>
          {leftSection}
          {children}
        </button>
      ),
      Panel: ({ children, value, ...props }: MockTabsPanelProps) => (
        <div data-testid="tabs-panel" data-value={value} {...props}>
          {children}
        </div>
      ),
    }
  ),
  List: Object.assign(
    ({ children, ...props }: MockComponentProps) => <ul data-testid="list" {...props}>{children}</ul>,
    {
      Item: ({ children, ...props }: MockComponentProps) => <li data-testid="list-item" {...props}>{children}</li>,
    }
  ),
  Timeline: ({ children, ...props }: MockComponentProps) => <div data-testid="timeline" {...props}>{children}</div>,
  'Timeline.Item': ({ children, title, ...props }: MockTimelineItemProps) => (
    <div data-testid="timeline-item" data-title={title} {...props}>
      {children}
    </div>
  ),
  Select: ({ data, value, onChange, ...props }: MockSelectProps) => (
    <select data-testid="select" value={value} onChange={onChange} {...props}>
      {data?.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  ),
  NumberInput: ({ value, onChange, ...props }: MockInputProps) => (
    <input data-testid="number-input" type="number" value={value} onChange={onChange} {...props} />
  ),
  Button: ({ children, onClick, ...props }: MockButtonProps) => (
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>
  ),
  Loader: ({ ...props }: MockComponentProps) => <div data-testid="loader" {...props}>Loading...</div>,
  Alert: ({ children, title, ...props }: MockAlertProps) => (
    <div data-testid="alert" data-title={title} {...props}>{children}</div>
  ),
}));

// Mock icons - use a generic mock that covers all possible icons
vi.mock('@tabler/icons-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  
  // Create a generic icon component factory
  const createMockIcon = (name: string) => () => (
    <span data-testid={`icon-${name.toLowerCase().replace(/^icon/, '').replace(/([A-Z])/g, '-$1').toLowerCase()}`}>
      {name}
    </span>
  );
  
  // Create mocks for all possible icons by intercepting property access
  return new Proxy(actual, {
     
    get(target, prop) {
      if (typeof prop === 'string' && prop.startsWith('Icon')) {
        return target[prop as keyof typeof target] || createMockIcon(prop);
      }
      return target[prop as string];
    }
  });
});

// Mock hooks
vi.mock('@/hooks/use-author-works', () => ({
  useAuthorWorks: () => ({
    works: [],
    totalCount: 0,
    loading: false,
    error: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
    updateOptions: vi.fn(),
  }),
}));

// Mock design tokens utils
vi.mock('@/components/design-tokens.utils', () => ({
  getOpenAccessColour: () => 'blue',
  getEntityColour: () => 'blue',
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: MockLinkProps) => (
    <a data-testid="router-link" data-to={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock specific components that AuthorDisplay imports
vi.mock('@/components/organisms/raw-data-view', () => ({
  RawDataView: ({ data, title, entityType, entityId }: MockRawDataViewProps) => (
    <div data-testid="raw-data-view" data-title={title} data-entity-type={entityType} data-entity-id={entityId}>
      Raw Data: {JSON.stringify(data, null, 2)}
    </div>
  ),
}));

vi.mock('@/components/atoms/entity-link', () => ({
  EntityLink: ({ entityId, displayName, size, weight }: MockEntityLinkProps) => (
    <a data-testid="entity-link" data-entity-id={entityId} data-size={size} data-weight={weight}>
      {displayName}
    </a>
  ),
}));

vi.mock('@/components/organisms/WorksTimeline', () => ({
  WorksTimeline: ({ authorId, authorName }: MockWorksTimelineProps) => (
    <div data-testid="works-timeline" data-author-id={authorId} data-author-name={authorName}>
      Works Timeline for {authorName}
    </div>
  ),
}));

// Mock author data
const createMockAuthor = (overrides: Partial<Author> = {}): Author => ({
  id: 'https://openalex.org/A123456789',
  display_name: 'Dr. Jane Smith',
  orcid: '0000-0000-0000-0000',
  works_count: 150,
  cited_by_count: 2500,
  summary_stats: {
    h_index: 25,
    i10_index: 45,
    '2yr_mean_citedness': 8.5,
  },
  affiliations: [
    {
      institution: {
        id: 'https://openalex.org/I12345',
        display_name: 'University of Example',
        country_code: 'US',
        type: 'education',
      },
      years: [2020, 2021, 2022, 2023],
    },
  ],
  last_known_institutions: [
    {
      id: 'https://openalex.org/I12345',
      display_name: 'University of Example',
      country_code: 'US',
      type: 'education',
      type_id: 'https://openalex.org/institution-types/education',
      ror: 'https://ror.org/12345',
      ids: { openalex: 'https://openalex.org/I12345', ror: 'https://ror.org/12345' },
      works_count: 1000,
      cited_by_count: 5000,
      summary_stats: {
        '2yr_mean_citedness': 2.5,
        h_index: 45,
        i10_index: 120
      },
      counts_by_year: [],
      works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I12345',
      updated_date: '2024-01-01',
      created_date: '2020-01-01'
    },
  ],
  topics: [
    {
      id: 'https://openalex.org/T123',
      display_name: 'Machine Learning',
      works_count: 50000,
      cited_by_count: 200000,
      ids: { openalex: 'https://openalex.org/T123', wikipedia: 'https://en.wikipedia.org/wiki/Machine_learning' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T123',
      updated_date: '2024-01-01',
      created_date: '2020-01-01'
    },
    {
      id: 'https://openalex.org/T456',
      display_name: 'Artificial Intelligence',
      works_count: 75000,
      cited_by_count: 300000,
      ids: { openalex: 'https://openalex.org/T456', wikipedia: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T456',
      updated_date: '2024-01-01',
      created_date: '2020-01-01'
    },
  ],
  display_name_alternatives: ['Jane A. Smith', 'J. Smith'],
  counts_by_year: [
    { year: 2023, works_count: 12, cited_by_count: 180 },
    { year: 2022, works_count: 15, cited_by_count: 220 },
    { year: 2021, works_count: 10, cited_by_count: 150 },
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A123456789',
  created_date: '2020-01-01',
  updated_date: '2023-12-01',
  ids: {
    openalex: 'https://openalex.org/A123456789',
    orcid: 'https://orcid.org/0000-0000-0000-0000',
    wikipedia: 'https://en.wikipedia.org/wiki/Jane_Smith',
    wikidata: 'Q123456',
  },
  ...overrides,
});

describe('AuthorDisplay Component', () => {
  describe('Basic Rendering', () => {
    it('should render author header with name and badges', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.getByText('ORCID Verified')).toBeInTheDocument();
    });

    it('should render without ORCID badge when ORCID is not present', () => {
      const author = createMockAuthor({ orcid: undefined });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.queryByText('ORCID Verified')).not.toBeInTheDocument();
    });

    it('should render tabs with correct default value', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-default-value', 'overview');
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Works')).toBeInTheDocument();
      expect(screen.getByText('Raw Data')).toBeInTheDocument();
    });
  });

  describe('Key Metrics', () => {
    it('should display works count formatted with locale string', () => {
      const author = createMockAuthor({ works_count: 1234 });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('Works Published')).toBeInTheDocument();
    });

    it('should display citation count formatted with locale string', () => {
      const author = createMockAuthor({ cited_by_count: 5678 });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('5,678')).toBeInTheDocument();
      expect(screen.getByText('Total Citations')).toBeInTheDocument();
    });

    it('should display h-index and i10-index', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      // Use getAllByText and check that we have the expected counts
      const h25Elements = screen.getAllByText('25');
      expect(h25Elements.length).toBeGreaterThanOrEqual(1);
      const hindexElements = screen.getAllByText('h-index');
      expect(hindexElements.length).toBeGreaterThanOrEqual(1);
      
      const i45Elements = screen.getAllByText('45');
      expect(i45Elements.length).toBeGreaterThanOrEqual(1);
      const i10indexElements = screen.getAllByText('i10-index');
      expect(i10indexElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing summary stats gracefully', () => {
      const author = createMockAuthor({ summary_stats: undefined });
      render(<AuthorDisplay entity={author} />);
      
      // Check that we have multiple "0" elements (for h-index and i10-index fallbacks)
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
      const hindexElements = screen.getAllByText('h-index');
      expect(hindexElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Research Impact Metrics', () => {
    it('should display 2-year mean citedness with decimal precision', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('8.50')).toBeInTheDocument();
      expect(screen.getByText('2-Year Mean Citedness')).toBeInTheDocument();
    });

    it('should display detailed metric descriptions', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Average citations per work over last 2 years')).toBeInTheDocument();
      expect(screen.getByText('Has 25 papers with ≥25 citations each')).toBeInTheDocument();
      expect(screen.getByText('Number of works with ≥10 citations')).toBeInTheDocument();
    });
  });

  describe('Affiliations', () => {
    it('should render institutional affiliations when present', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Institutional Affiliations')).toBeInTheDocument();
      // Use getAllByText since "University of Example" appears in multiple sections
      const universityElements = screen.getAllByText('University of Example');
      expect(universityElements.length).toBeGreaterThanOrEqual(1);
      const usElements = screen.getAllByText('US');
      expect(usElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('2020 - 2023')).toBeInTheDocument();
    });

    it('should not render affiliations section when empty', () => {
      const author = createMockAuthor({ affiliations: [] });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('Institutional Affiliations')).not.toBeInTheDocument();
    });

    it('should handle affiliations without years', () => {
      const author = createMockAuthor({
        affiliations: [{
          institution: {
            id: 'https://openalex.org/I12345',
            display_name: 'University of Example',
            country_code: 'US',
            type: 'education',
          },
          years: [],
        }],
      });
      render(<AuthorDisplay entity={author} />);
      
      // Use getAllByText since "University of Example" appears in multiple sections
      const universityElements = screen.getAllByText('University of Example');
      expect(universityElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('- ')).not.toBeInTheDocument(); // No year range
    });
  });

  describe('Last Known Institutions', () => {
    it('should render last known institutions when present', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Most Recent Institutions')).toBeInTheDocument();
      expect(screen.getByText('ROR: https://ror.org/12345')).toBeInTheDocument();
    });

    it('should not render last known institutions section when empty', () => {
      const author = createMockAuthor({ last_known_institutions: [] });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('Most Recent Institutions')).not.toBeInTheDocument();
    });
  });

  describe('Research Topics', () => {
    it('should render research topics when present', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Research Topics')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
    });

    it('should not render topics section when empty', () => {
      const author = createMockAuthor({ topics: [] });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('Research Topics')).not.toBeInTheDocument();
    });
  });

  describe('Alternative Names', () => {
    it('should render alternative names when present', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Alternative Names')).toBeInTheDocument();
      expect(screen.getByText('Jane A. Smith')).toBeInTheDocument();
      expect(screen.getByText('J. Smith')).toBeInTheDocument();
    });

    it('should not render alternative names section when empty', () => {
      const author = createMockAuthor({ display_name_alternatives: [] });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('Alternative Names')).not.toBeInTheDocument();
    });
  });

  describe('Publication Timeline', () => {
    it('should render publication timeline when counts by year exist', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Publication Activity by Year')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // works count for 2023
      expect(screen.getByText('180 cites')).toBeInTheDocument();
    });

    it('should not render timeline section when counts by year is empty', () => {
      const author = createMockAuthor({ counts_by_year: [] });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('Publication Activity by Year')).not.toBeInTheDocument();
    });

    it('should filter and sort years correctly', () => {
      const currentYear = new Date().getFullYear();
      const author = createMockAuthor({
        counts_by_year: [
          { year: currentYear, works_count: 5, cited_by_count: 50 },
          { year: currentYear - 15, works_count: 3, cited_by_count: 30 }, // Should be filtered out
          { year: currentYear - 5, works_count: 8, cited_by_count: 80 },
        ],
      });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText(currentYear.toString())).toBeInTheDocument();
      expect(screen.getByText((currentYear - 5).toString())).toBeInTheDocument();
      expect(screen.queryByText((currentYear - 15).toString())).not.toBeInTheDocument();
    });
  });

  describe('Author Details', () => {
    it('should render author details with formatted dates', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Author Details')).toBeInTheDocument();
      expect(screen.getByText('https://openalex.org/A123456789')).toBeInTheDocument();
      expect(screen.getByText('0000-0000-0000-0000')).toBeInTheDocument();
      
      // Use getAllByText for dates that might appear multiple times
      const year2020Elements = screen.getAllByText(/2020/);
      expect(year2020Elements.length).toBeGreaterThanOrEqual(1); // Created date contains 2020
      const year2023Elements = screen.getAllByText(/2023/);
      expect(year2023Elements.length).toBeGreaterThanOrEqual(1); // Updated date contains 2023
    });

    it('should not render ORCID section when ORCID is not present', () => {
      const author = createMockAuthor({ orcid: undefined });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('Author Details')).toBeInTheDocument();
      expect(screen.queryByText('ORCID iD')).not.toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('should render external links with correct URLs', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.getByText('External Resources')).toBeInTheDocument();
      
      const orcidLink = screen.getByText('ORCID Profile').closest('a');
      expect(orcidLink).toHaveAttribute('href', 'https://orcid.org/0000-0000-0000-0000');
      
      const wikipediaLink = screen.getByText('Wikipedia').closest('a');
      expect(wikipediaLink).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Jane_Smith');
      
      const wikidataLink = screen.getByText('Wikidata').closest('a');
      expect(wikidataLink).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q123456');
      
      const openalexLink = screen.getByText('View on OpenAlex').closest('a');
      expect(openalexLink).toHaveAttribute('href', 'https://openalex.org/https://openalex.org/A123456789');
    });

    it('should only render available external links', () => {
      const author = createMockAuthor({
        orcid: undefined,
        ids: {
          openalex: 'https://openalex.org/A123456789',
          wikipedia: undefined,
          wikidata: undefined,
        },
      });
      render(<AuthorDisplay entity={author} />);
      
      expect(screen.queryByText('ORCID Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Wikipedia')).not.toBeInTheDocument();
      expect(screen.queryByText('Wikidata')).not.toBeInTheDocument();
      expect(screen.getByText('View on OpenAlex')).toBeInTheDocument();
    });
  });

  describe('Tab Content', () => {
    it('should render WorksTimeline in works tab', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      const worksTimeline = screen.getByTestId('works-timeline');
      expect(worksTimeline).toBeInTheDocument();
      expect(worksTimeline).toHaveAttribute('data-author-id', 'https://openalex.org/A123456789');
      expect(worksTimeline).toHaveAttribute('data-author-name', 'Dr. Jane Smith');
    });

    it('should render RawDataView in raw data tab', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      const rawDataView = screen.getByTestId('raw-data-view');
      expect(rawDataView).toBeInTheDocument();
      expect(rawDataView).toHaveAttribute('data-title', 'Author Raw Data');
      expect(rawDataView).toHaveAttribute('data-entity-type', 'author');
      expect(rawDataView).toHaveAttribute('data-entity-id', 'https://openalex.org/A123456789');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      const titles = screen.getAllByTestId('title');
      expect(titles.length).toBeGreaterThan(0);
      
      // Main title should be order 1
      const mainTitle = titles.find(title => title.textContent === 'Dr. Jane Smith');
      expect(mainTitle).toHaveAttribute('data-order', '1');
    });

    it('should have accessible external links', () => {
      const author = createMockAuthor();
      render(<AuthorDisplay entity={author} />);
      
      const externalLinks = screen.getAllByTestId('anchor');
      externalLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing optional data gracefully', () => {
      const author = createMockAuthor({
        works_count: undefined,
        cited_by_count: undefined,
        summary_stats: undefined,
        affiliations: undefined,
        last_known_institutions: undefined,
        topics: undefined,
        display_name_alternatives: undefined,
        counts_by_year: undefined,
        orcid: undefined,
        ids: { openalex: 'https://openalex.org/A123456789' },
      });

      expect(() => render(<AuthorDisplay entity={author} />)).not.toThrow();
      
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      // Use getAllByText since "0" appears multiple times for different default values
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1); // Default works count and other fallbacks
    });

    it('should handle empty arrays gracefully', () => {
      const author = createMockAuthor({
        affiliations: [],
        last_known_institutions: [],
        topics: [],
        display_name_alternatives: [],
        counts_by_year: [],
      });

      expect(() => render(<AuthorDisplay entity={author} />)).not.toThrow();
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    });
  });
});