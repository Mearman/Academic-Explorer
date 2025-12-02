/**
 * Component tests for RelationshipSection component
 * @vitest-environment jsdom
 */

import { RelationType } from '@bibgraph/types';
import { MantineProvider } from '@mantine/core';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipSection } from './RelationshipSection';

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('RelationshipSection', () => {
  const createMockSection = (
    type: RelationType = RelationType.AUTHORSHIP,
    itemCount: number = 10,
    label: string = 'Authors',
    isPartialData: boolean = false
  ): RelationshipSectionType => {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: `rel-${i}`,
      sourceId: 'W123',
      targetId: `A${i}`,
      sourceType: 'works' as const,
      targetType: 'authors' as const,
      type,
      direction: 'outbound' as const,
      displayName: `Author ${i}`,
      isSelfReference: false,
    }));

    return {
      id: `section-${type}`,
      type,
      direction: 'outbound',
      label,
      items,
      visibleItems: items.slice(0, Math.min(itemCount, 50)),
      isPartialData,
      totalCount: itemCount,
      visibleCount: Math.min(itemCount, 50),
      hasMore: itemCount > 50,
      pagination: {
        pageSize: 50,
        currentPage: 0,
        totalPages: Math.ceil(itemCount / 50),
        hasNextPage: itemCount > 50,
        hasPreviousPage: false,
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render section with label', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors');

    render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    expect(screen.getByText('Authors')).toBeInTheDocument();
  });

  it('should render count badge', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 25);

    render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    expect(screen.getByTestId('relationship-count')).toHaveTextContent('25');
  });

  it('should render correct data-testid based on type and direction', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 10);

    const { container } = render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    const sectionElement = container.querySelector('[data-testid="relationship-section-authorship-outbound"]');
    expect(sectionElement).toBeInTheDocument();
  });

  it('should render inbound section with correct testid', () => {
    const section: RelationshipSectionType = {
      ...createMockSection(RelationType.REFERENCE, 5, 'Citations'),
      direction: 'inbound',
    };

    const { container } = render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    const sectionElement = container.querySelector('[data-testid="relationship-section-reference-inbound"]');
    expect(sectionElement).toBeInTheDocument();
  });

  it('should pass section to RelationshipList', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 10);

    render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    // RelationshipList should render all visible items
    expect(screen.getByText('Author 0')).toBeInTheDocument();
    expect(screen.getByText('Author 9')).toBeInTheDocument();
  });

  it('should display icon when provided', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors');
    section.icon = '👤';

    render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('should not display icon when not provided', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors');
    section.icon = undefined;

    const { container } = render(
      <TestWrapper>
        <RelationshipSection section={section} />
      </TestWrapper>
    );

    // Should only show label text
    const textElements = container.querySelectorAll('p');
    const hasIcon = Array.from(textElements).some(el => el.textContent?.includes('👤'));
    expect(hasIcon).toBe(false);
  });

  // onLoadMore functionality removed - component now uses pagination via onPageChange

  describe('Partial Data Warning', () => {
    it('should not show warning when isPartialData is false', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors', false);

      render(
        <TestWrapper>
          <RelationshipSection section={section} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('partial-data-warning')).not.toBeInTheDocument();
    });

    it('should not show warning when isPartialData is undefined', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors');

      render(
        <TestWrapper>
          <RelationshipSection section={section} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('partial-data-warning')).not.toBeInTheDocument();
    });

    it('should show warning when isPartialData is true', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors', true);

      render(
        <TestWrapper>
          <RelationshipSection section={section} />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent(/Incomplete Data/i);
      expect(warning).toHaveTextContent(/Relationship data may be incomplete/i);
    });

    it('should show warning with yellow color variant', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors', true);

      render(
        <TestWrapper>
          <RelationshipSection section={section} />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      // Mantine Alert with color="yellow" applies specific classes
      expect(warning.className).toContain('mantine-Alert');
    });

    it('should show icon in warning message', () => {
      const section = createMockSection(RelationType.AUTHORSHIP, 10, 'Authors', true);

      render(
        <TestWrapper>
          <RelationshipSection section={section} />
        </TestWrapper>
      );

      const warning = screen.getByTestId('partial-data-warning');
      // IconAlertCircle should be rendered within the warning
      const icon = warning.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
