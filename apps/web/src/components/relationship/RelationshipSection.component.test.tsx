/**
 * Component tests for RelationshipSection component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom';
import { RelationshipSection } from './RelationshipSection';
import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';
import { RelationType } from '@academic-explorer/graph';

// Mock useEntityInteraction hook
vi.mock('@/hooks/use-entity-interaction', () => ({
  useEntityInteraction: () => ({
    handleSidebarEntityClick: vi.fn(),
  }),
}));

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('RelationshipSection', () => {
  const createMockSection = (
    type: RelationType = RelationType.AUTHORSHIP,
    itemCount: number = 10,
    label: string = 'Authors'
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

  it('should pass onLoadMore callback to RelationshipList', () => {
    const section = createMockSection(RelationType.AUTHORSHIP, 100); // More than 50 items
    const onLoadMore = vi.fn();

    render(
      <TestWrapper>
        <RelationshipSection section={section} onLoadMore={onLoadMore} />
      </TestWrapper>
    );

    // RelationshipList should have "Load more" button
    const loadMoreButton = screen.queryByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();
  });
});
