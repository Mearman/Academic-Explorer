/**
 * Component tests for RelationshipList component
 * @vitest-environment jsdom
 */

import { RelationType } from '@academic-explorer/types';
import { MantineProvider } from '@mantine/core';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { RelationshipSection, RelationshipItem } from '@/types/relationship';

import { RelationshipList } from './RelationshipList';

// Test wrapper with MantineProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('RelationshipList', () => {
  const createMockItems = (count: number): RelationshipItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `rel-${i}`,
      sourceId: 'W123',
      targetId: `A${i}`,
      sourceType: 'works' as const,
      targetType: 'authors' as const,
      type: RelationType.AUTHORSHIP,
      direction: 'outbound' as const,
      displayName: `Author ${i}`,
      isSelfReference: false,
    }));
  };

  const createMockSection = (itemCount: number): RelationshipSection => ({
    id: 'section-1',
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
    label: 'Authors',
    items: createMockItems(itemCount),
    visibleItems: createMockItems(Math.min(itemCount, 50)),
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render all items when count is less than page size', () => {
    const section = createMockSection(10);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    // Should show all 10 items
    expect(screen.getByText('Author 0')).toBeInTheDocument();
    expect(screen.getByText('Author 9')).toBeInTheDocument();
  });

  it('should display "Showing X of Y" count', () => {
    const section = createMockSection(10);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    expect(screen.getByText('Showing 10 of 10')).toBeInTheDocument();
  });

  it('should display "Load more" button when hasMore is true', () => {
    const section = createMockSection(150);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('should not display "Load more" button when all items are visible', () => {
    const section = createMockSection(10);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('should load more items when "Load more" is clicked', async () => {
    const section = createMockSection(150);
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    // Initially shows 50 items
    expect(screen.getByText('Showing 50 of 150')).toBeInTheDocument();

    // Click "Load more"
    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    // Should now show 100 items
    expect(screen.getByText('Showing 100 of 150')).toBeInTheDocument();
  });

  it('should call onLoadMore callback when "Load more" is clicked', async () => {
    const section = createMockSection(150);
    const onLoadMore = vi.fn();
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipList section={section} onLoadMore={onLoadMore} />
      </TestWrapper>
    );

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('should hide "Load more" button when all items are loaded', async () => {
    const section = createMockSection(75); // 75 items = 2 pages
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    // Initially shows 50 items with "Load more" button
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();

    // Click "Load more"
    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    // Should now show all 75 items without "Load more" button
    expect(screen.getByText('Showing 75 of 75')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('should handle edge case with exactly 50 items', () => {
    const section = createMockSection(50);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    // Should show all 50 items without "Load more" button
    expect(screen.getByText('Showing 50 of 50')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('should handle edge case with 51 items', () => {
    const section = createMockSection(51);

    render(
      <TestWrapper>
        <RelationshipList section={section} />
      </TestWrapper>
    );

    // Should show 50 items with "Load more" button
    expect(screen.getByText('Showing 50 of 51')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });
});
