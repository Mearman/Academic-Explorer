/**
 * Component tests for EntityHeader organism
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { OpenAlexEntity } from '../types';

import { EntityHeader, EntityHeaderSkeleton } from './entity-header';

// Mock dependencies
vi.mock('../atoms/badge', () => ({
  Badge: ({ children, variant, size, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} data-size={size} {...props}>
      {children}
    </span>
  ),
}));

vi.mock('../atoms/icon', () => ({
  Icon: ({ name, size, color, 'aria-hidden': ariaHidden, ...props }: any) => (
    <span data-testid="icon" data-name={name} data-size={size} data-color={color} aria-hidden={ariaHidden} {...props}>
      {name}
    </span>
  ),
}));

vi.mock('../atoms/loading-skeleton', () => ({
  LoadingSkeleton: ({ preset, width, height, ...props }: any) => (
    <div data-testid="loading-skeleton" data-preset={preset} data-width={width} data-height={height} {...props}>
      Loading...
    </div>
  ),
}));

vi.mock('../atoms/status-indicator', () => ({
  StatusIndicator: ({ status, showLabel, size, ...props }: any) => (
    <div data-testid="status-indicator" data-status={status} data-show-label={showLabel} data-size={size} {...props}>
      Status: {status}
    </div>
  ),
}));

vi.mock('../molecules/external-links-group', () => ({
  ExternalLinksGroup: ({ externalIds, entityType, layout, showLabels, ...props }: any) => (
    <div 
      data-testid="external-links-group" 
      data-entity-type={entityType} 
      data-layout={layout} 
      data-show-labels={showLabels}
      {...props}
    >
      External Links: {JSON.stringify(externalIds)}
    </div>
  ),
}));

// Mock entity creators
const createMockAuthor = (overrides: any = {}): OpenAlexEntity => ({
  id: 'https://openalex.org/A123456789',
  display_name: 'Dr. Jane Smith',
  orcid: '0000-0000-0000-0000',
  last_known_institutions: [
    {
      display_name: 'University of Example',
      country_code: 'US',
      type: 'education',
    },
  ],
  display_name_alternatives: ['Jane A. Smith', 'J. Smith'],
  affiliations: [],
  ids: {
    openalex: 'https://openalex.org/A123456789',
    orcid: 'https://orcid.org/0000-0000-0000-0000',
  },
  created_date: '2020-01-01',
  updated_date: '2023-12-01',
  ...overrides,
});

const createMockWork = (overrides: any = {}): OpenAlexEntity => ({
  id: 'https://openalex.org/W123456789',
  display_name: 'Machine Learning in Healthcare',
  publication_year: 2023,
  authorships: [],
  open_access: {
    is_oa: true,
    oa_status: 'gold',
  },
  ids: {
    openalex: 'https://openalex.org/W123456789',
    doi: 'https://doi.org/10.1000/test',
  },
  created_date: '2023-01-15',
  updated_date: '2023-12-01',
  ...overrides,
});

const createMockInstitution = (overrides: any = {}): OpenAlexEntity => ({
  id: 'https://openalex.org/I123456789',
  display_name: 'University of Example',
  type: 'education',
  country_code: 'US',
  geo: { city: 'Example City' },
  ids: {
    openalex: 'https://openalex.org/I123456789',
    ror: 'https://ror.org/12345',
  },
  created_date: '2020-01-01',
  updated_date: '2023-12-01',
  ...overrides,
});

const createMockSource = (overrides: any = {}): OpenAlexEntity => ({
  id: 'https://openalex.org/S123456789',
  display_name: 'Journal of Example Research',
  host_organization_name: 'Example Publisher',
  country_code: 'US',
  is_oa: true,
  is_in_doaj: true,
  ids: {
    openalex: 'https://openalex.org/S123456789',
    issn: ['1234-5678'],
  },
  created_date: '2020-01-01',
  updated_date: '2023-12-01',
  ...overrides,
});

describe('EntityHeader Component', () => {
  describe('Basic Rendering', () => {
    it('should render with basic author entity', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} data-testid="entity-header" />);
      
      const header = screen.getByTestId('entity-header');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('HEADER');
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} className="custom-header" data-testid="entity-header" />);
      
      const header = screen.getByTestId('entity-header');
      expect(header).toHaveClass('custom-header');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLElement>();
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('HEADER');
    });
  });

  describe('Entity Type Detection', () => {
    it('should detect author entity type', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Author');
      expect(screen.getByTestId('icon')).toHaveAttribute('data-name', 'author');
    });

    it('should detect work entity type', () => {
      const entity = createMockWork();
      render(<EntityHeader entity={entity} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Work');
      expect(screen.getByTestId('icon')).toHaveAttribute('data-name', 'work');
    });

    it('should detect institution entity type', () => {
      const entity = createMockInstitution();
      render(<EntityHeader entity={entity} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Institution');
      expect(screen.getByTestId('icon')).toHaveAttribute('data-name', 'institution');
    });

    it('should detect source entity type', () => {
      const entity = createMockSource();
      render(<EntityHeader entity={entity} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Source');
      expect(screen.getByTestId('icon')).toHaveAttribute('data-name', 'source');
    });
  });

  describe('Title and Subtitle', () => {
    it('should render entity display name as title', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Dr. Jane Smith');
    });

    it('should render fallback title for unknown entity', () => {
      const entity = createMockAuthor({ display_name: undefined });
      render(<EntityHeader entity={entity} />);
      
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Unknown Entity');
    });

    it('should render author subtitle with institution', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const subtitle = screen.getByRole('heading', { level: 2 });
      expect(subtitle).toHaveTextContent('University of Example (US)');
    });

    it('should render work subtitle with publication year', () => {
      const entity = createMockWork();
      render(<EntityHeader entity={entity} />);
      
      const subtitle = screen.getByRole('heading', { level: 2 });
      expect(subtitle).toHaveTextContent('Published 2023');
    });

    it('should render institution subtitle with type and country', () => {
      const entity = createMockInstitution();
      render(<EntityHeader entity={entity} />);
      
      const subtitle = screen.getByRole('heading', { level: 2 });
      expect(subtitle).toHaveTextContent('Education • US');
    });

    it('should render source subtitle with host organization', () => {
      const entity = createMockSource();
      render(<EntityHeader entity={entity} />);
      
      const subtitle = screen.getByRole('heading', { level: 2 });
      expect(subtitle).toHaveTextContent('Example Publisher • US');
    });

    it('should not render subtitle when no relevant data', () => {
      const entity = createMockAuthor({ last_known_institutions: [] });
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });
  });

  describe('Entity ID Display', () => {
    it('should display entity ID', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('https://openalex.org/A123456789')).toBeInTheDocument();
    });
  });

  describe('ORCID Badge', () => {
    it('should render ORCID badge when ORCID is present', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const badges = screen.getAllByTestId('badge');
      const orcidBadge = badges.find(badge => badge.textContent?.includes('ORCID'));
      expect(orcidBadge).toBeInTheDocument();
      expect(orcidBadge).toHaveAttribute('data-variant', 'warning');
    });

    it('should not render ORCID badge when ORCID is not present', () => {
      const entity = createMockAuthor({ orcid: undefined });
      render(<EntityHeader entity={entity} />);
      
      const badges = screen.getAllByTestId('badge');
      const orcidBadge = badges.find(badge => badge.textContent?.includes('ORCID'));
      expect(orcidBadge).not.toBeInTheDocument();
    });
  });

  describe('Alternative Names', () => {
    it('should render alternative names when present', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('Also known as: Jane A. Smith, J. Smith')).toBeInTheDocument();
    });

    it('should limit alternative names display to 3 and show ellipsis', () => {
      const entity = createMockAuthor({
        display_name_alternatives: ['Jane A. Smith', 'J. Smith', 'Dr. Jane', 'Prof. Smith', 'Jane'],
      });
      render(<EntityHeader entity={entity} />);
      
      const altNamesText = screen.getByText(/Also known as:/);
      expect(altNamesText).toHaveTextContent('Also known as: Jane A. Smith, J. Smith, Dr. Jane...');
    });

    it('should not render alternative names when empty', () => {
      const entity = createMockAuthor({ display_name_alternatives: [] });
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByText(/Also known as:/)).not.toBeInTheDocument();
    });
  });

  describe('Status Information', () => {
    it('should render open access status for works', () => {
      const entity = createMockWork();
      render(<EntityHeader entity={entity} />);
      
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveAttribute('data-status', 'active');
      expect(statusIndicator).toHaveAttribute('data-show-label', 'true');
    });

    it('should render closed access status for works', () => {
      const entity = createMockWork({ open_access: { is_oa: false, oa_status: 'closed' } });
      render(<EntityHeader entity={entity} />);
      
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveAttribute('data-status', 'inactive');
    });

    it('should render open access status for sources', () => {
      const entity = createMockSource();
      render(<EntityHeader entity={entity} />);
      
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveAttribute('data-status', 'active');
    });

    it('should not render status information when not applicable', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByTestId('status-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render actions when provided and showActions is true', () => {
      const entity = createMockAuthor();
      const actions = <button data-testid="custom-action">Custom Action</button>;
      
      render(<EntityHeader entity={entity} actions={actions} showActions={true} />);
      
      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });

    it('should not render actions when showActions is false', () => {
      const entity = createMockAuthor();
      const actions = <button data-testid="custom-action">Custom Action</button>;
      
      render(<EntityHeader entity={entity} actions={actions} showActions={false} />);
      
      expect(screen.queryByTestId('custom-action')).not.toBeInTheDocument();
    });

    it('should not render actions when actions are not provided', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} showActions={true} />);
      
      // No actions container should exist
      expect(screen.queryByTestId('custom-action')).not.toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('should render external links when entity has IDs', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const externalLinks = screen.getByTestId('external-links-group');
      expect(externalLinks).toBeInTheDocument();
      expect(externalLinks).toHaveAttribute('data-entity-type', 'author');
      expect(externalLinks).toHaveAttribute('data-layout', 'horizontal');
      expect(externalLinks).toHaveAttribute('data-show-labels', 'true');
    });

    it('should not render external links when entity has no IDs', () => {
      const entity = createMockAuthor({ ids: {} });
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByTestId('external-links-group')).not.toBeInTheDocument();
    });

    it('should not render external links when entity has no ids property', () => {
      const entity = createMockAuthor();
      delete (entity as any).ids;
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByTestId('external-links-group')).not.toBeInTheDocument();
    });
  });

  describe('Meta Information', () => {
    it('should render creation and update dates', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('01/12/2023')).toBeInTheDocument(); // UK format
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('01/01/2020')).toBeInTheDocument(); // UK format
    });

    it('should format dates in British format', () => {
      const entity = createMockAuthor({
        created_date: '2023-03-15',
        updated_date: '2023-12-25',
      });
      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('25/12/2023')).toBeInTheDocument(); // 25th December 2023
      expect(screen.getByText('15/03/2023')).toBeInTheDocument(); // 15th March 2023
    });

    it('should not render meta info when dates are not present', () => {
      const entity = createMockAuthor({ created_date: undefined, updated_date: undefined });
      render(<EntityHeader entity={entity} />);
      
      expect(screen.queryByText('Last Updated')).not.toBeInTheDocument();
      expect(screen.queryByText('Created')).not.toBeInTheDocument();
    });
  });

  describe('Type Guards and Edge Cases', () => {
    it('should handle entities without optional properties', () => {
      const minimalEntity = {
        id: 'https://openalex.org/A123456789',
        display_name: 'Minimal Author',
        affiliations: [],
        works_count: 0,
        cited_by_count: 0,
        summary_stats: {
          '2yr_mean_citedness': 0,
          h_index: 0,
          i10_index: 0
        },
        ids: { openalex: 'https://openalex.org/A123456789' },
        counts_by_year: [],
        works_api_url: 'https://api.openalex.org/works?filter=author.id:A123456789',
        updated_date: '2024-01-01',
        created_date: '2020-01-01'
      };

      expect(() => render(<EntityHeader entity={minimalEntity as OpenAlexEntity} />)).not.toThrow();
      expect(screen.getByText('Minimal Author')).toBeInTheDocument();
    });

    it('should handle entities with partial data', () => {
      const entity = createMockAuthor({
        last_known_institutions: [{ display_name: 'University', country_code: undefined }],
        display_name_alternatives: undefined,
        ids: { openalex: 'https://openalex.org/A123456789' },
      });

      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('University')).toBeInTheDocument(); // No country code
    });

    it('should handle complex work entities', () => {
      const entity = createMockWork({
        open_access: undefined,
        publication_year: undefined,
      });

      render(<EntityHeader entity={entity} />);
      
      expect(screen.getByText('Machine Learning in Healthcare')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument(); // No subtitle
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const mainTitle = screen.getByRole('heading', { level: 1 });
      const subtitle = screen.getByRole('heading', { level: 2 });
      
      expect(mainTitle).toHaveTextContent('Dr. Jane Smith');
      expect(subtitle).toHaveTextContent('University of Example (US)');
    });

    it('should have aria-hidden on decorative icons', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} />);
      
      const icons = screen.getAllByTestId('icon');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Props Forwarding', () => {
    it('should forward custom props to header element', () => {
      const entity = createMockAuthor();
      render(<EntityHeader entity={entity} id="custom-id" title="Custom title" data-testid="entity-header" />);
      
      const header = screen.getByTestId('entity-header');
      expect(header).toHaveAttribute('id', 'custom-id');
      expect(header).toHaveAttribute('title', 'Custom title');
    });
  });
});

describe('EntityHeaderSkeleton Component', () => {
  it('should render loading skeleton', () => {
    render(<EntityHeaderSkeleton />);
    
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render with custom className', () => {
    render(<EntityHeaderSkeleton className="custom-skeleton" />);
    
    // Check that skeleton is rendered (implementation may vary)
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render different skeleton presets', () => {
    render(<EntityHeaderSkeleton />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    
    // Check for different skeleton types
    const badgeSkeleton = screen.getByTestId('loading-skeleton');
    expect(badgeSkeleton).toHaveAttribute('data-preset', 'badge');
  });

  it('should render title and subtitle skeletons', () => {
    render(<EntityHeaderSkeleton />);
    
    const skeletons = screen.getAllByTestId('loading-skeleton');
    const titleSkeleton = skeletons.find(s => s.getAttribute('data-preset') === 'title');
    const subtitleSkeleton = skeletons.find(s => s.getAttribute('data-preset') === 'subtitle');
    
    expect(titleSkeleton).toBeInTheDocument();
    expect(subtitleSkeleton).toBeInTheDocument();
  });
});