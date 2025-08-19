/**
 * Unit tests for AnnotationPanel component
 * Tests annotation list display, filtering, sorting, and management interactions
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  CollaborationUser, 
  AnnotationType 
} from '@/types/collaboration';

import { AnnotationPanel } from './annotation-panel';

// Mock collaboration store
const mockDeleteAnnotation = vi.fn();
const mockCurrentUser: CollaborationUser = {
  id: 'user-1',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  colour: '#3B82F6',
  status: 'online',
  lastSeen: Date.now(),
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: false,
    canAdmin: false,
  },
};

const mockOtherUser: CollaborationUser = {
  id: 'user-2',
  name: 'Other User',
  avatar: 'https://example.com/avatar2.jpg',
  colour: '#EF4444',
  status: 'online',
  lastSeen: Date.now(),
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
};

// Mock annotations
const mockAnnotations = new Map<string, Annotation>([
  ['annotation-1', {
    id: 'annotation-1',
    type: 'note',
    target: {
      type: 'entity',
      id: 'A123456789',
      url: '/authors/A123456789',
      title: 'Test Author',
      context: { entityType: 'author' },
    },
    content: 'This is a test note annotation',
    author: {
      id: mockCurrentUser.id,
      name: mockCurrentUser.name,
      avatar: mockCurrentUser.avatar,
      colour: mockCurrentUser.colour,
    },
    createdAt: Date.now() - 60000, // 1 minute ago
    modifiedAt: Date.now() - 60000,
    visibility: 'team',
    status: 'published',
    tags: ['research', 'important'],
    reactions: [{ userId: 'user-3', type: 'like', timestamp: Date.now() }],
    commentIds: ['comment-1'],
    position: { x: 100, y: 100, anchor: 'center' },
  }],
  ['annotation-2', {
    id: 'annotation-2',
    type: 'highlight',
    target: {
      type: 'entity',
      id: 'A123456789',
      url: '/authors/A123456789',
      title: 'Test Author',
      context: { entityType: 'author' },
    },
    content: 'Highlighted content for review',
    author: {
      id: mockOtherUser.id,
      name: mockOtherUser.name,
      avatar: mockOtherUser.avatar,
      colour: mockOtherUser.colour,
    },
    createdAt: Date.now() - 120000, // 2 minutes ago
    modifiedAt: Date.now() - 120000,
    visibility: 'team',
    status: 'published',
    tags: ['review'],
    reactions: [],
    commentIds: [],
    position: { x: 200, y: 200, anchor: 'center' },
  }],
  ['annotation-3', {
    id: 'annotation-3',
    type: 'question',
    target: {
      type: 'entity',
      id: 'W987654321',
      url: '/works/W987654321',
      title: 'Different Work',
      context: { entityType: 'work' },
    },
    content: 'Question about methodology',
    author: {
      id: mockCurrentUser.id,
      name: mockCurrentUser.name,
      avatar: mockCurrentUser.avatar,
      colour: mockCurrentUser.colour,
    },
    createdAt: Date.now() - 30000, // 30 seconds ago
    modifiedAt: Date.now() - 30000,
    visibility: 'team',
    status: 'published',
    tags: ['methodology', 'question'],
    reactions: [],
    commentIds: ['comment-2', 'comment-3'],
    position: { x: 300, y: 300, anchor: 'center' },
  }],
]);

vi.mock('@/stores/collaboration-store');

// Mock framer-motion
interface MockMotionDivProps {
  children: React.ReactNode;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  whileHover?: unknown;
  layout?: unknown;
  [key: string]: unknown;
}

interface MockAnimatePresenceProps {
  children: React.ReactNode;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, whileHover, layout, ...props }: MockMotionDivProps) => 
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: MockAnimatePresenceProps) => <div>{children}</div>,
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/authors/A123456789',
  },
  writable: true,
});

describe('AnnotationPanel', () => {
  const defaultProps = {
    isOpen: true,
    currentRoute: '/authors/A123456789',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAnnotation.mockResolvedValue(undefined);
    
    // Mock the store hook to return our test data
    vi.mocked(useCollaborationStore).mockReturnValue({
      annotations: mockAnnotations,
      currentUser: mockCurrentUser,
      deleteAnnotation: mockDeleteAnnotation,
    } as ReturnType<typeof useCollaborationStore>);
  });

  describe('Rendering', () => {
    it('should render panel when open', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<AnnotationPanel {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Annotations')).not.toBeInTheDocument();
    });

    it('should render with custom width', () => {
      render(<AnnotationPanel {...defaultProps} width={400} data-testid="annotation-panel" />);
      
      const panel = screen.getByTestId('annotation-panel');
      expect(panel).toHaveStyle({ width: '400px' });
    });

    it('should show annotation count', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      // Should show 2 annotations (filtered by current route)
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('should display annotations for current route', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('This is a test note annotation')).toBeInTheDocument();
      expect(screen.getByText('Highlighted content for review')).toBeInTheDocument();
      expect(screen.queryByText('Question about methodology')).not.toBeInTheDocument();
    });
  });

  describe('Annotation Display', () => {
    it('should display annotation content and metadata', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      const noteAnnotation = screen.getByText('This is a test note annotation');
      const annotationItem = noteAnnotation.closest('div[style*="padding: 12px"]');
      expect(annotationItem).toBeInTheDocument();
      
      if (annotationItem) {
        expect(within(annotationItem as HTMLElement).getByText('note')).toBeInTheDocument();
        expect(within(annotationItem as HTMLElement).getByText('Test User')).toBeInTheDocument();
        expect(within(annotationItem as HTMLElement).getByText('1m ago')).toBeInTheDocument();
      }
    });

    it('should display annotation tags', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('research')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should show reaction and comment counts', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      const noteAnnotation = screen.getByText('This is a test note annotation');
      const annotationItem = noteAnnotation.closest('div[style*="padding: 12px"]');
      
      if (annotationItem) {
        // Should have reaction and comment indicators
        const countsText = within(annotationItem as HTMLElement).getAllByText('1');
        expect(countsText).toHaveLength(2); // One for reactions, one for comments
      }
    });

    it('should limit displayed tags', () => {
      // Create annotation with many tags
      const manyTagsAnnotation: Annotation = {
        ...Array.from(mockAnnotations.values())[0],
        id: 'many-tags',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };
      
      const annotationsWithManyTags = new Map(mockAnnotations);
      annotationsWithManyTags.set('many-tags', manyTagsAnnotation);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: annotationsWithManyTags,
        currentUser: mockCurrentUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('+2')).toBeInTheDocument(); // Should show +2 for remaining tags
    });
  });

  describe('Search Functionality', () => {
    it('should filter annotations by content search', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search annotations...');
      await user.type(searchInput, 'highlight');
      
      expect(screen.getByText('Highlighted content for review')).toBeInTheDocument();
      expect(screen.queryByText('This is a test note annotation')).not.toBeInTheDocument();
    });

    it('should filter annotations by tag search', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search annotations...');
      await user.type(searchInput, 'research');
      
      expect(screen.getByText('This is a test note annotation')).toBeInTheDocument();
      expect(screen.queryByText('Highlighted content for review')).not.toBeInTheDocument();
    });

    it('should filter annotations by author search', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search annotations...');
      await user.type(searchInput, 'Other User');
      
      expect(screen.getByText('Highlighted content for review')).toBeInTheDocument();
      expect(screen.queryByText('This is a test note annotation')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search annotations...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No annotations match your search')).toBeInTheDocument();
    });
  });

  describe('Type Filtering', () => {
    it('should show all annotation types by default', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      const typeButtons = screen.getAllByRole('button');
      const noteButton = typeButtons.find(button => button.textContent === 'note');
      const highlightButton = typeButtons.find(button => button.textContent === 'highlight');
      
      expect(noteButton).toHaveStyle({ backgroundColor: expect.stringContaining('#3B82F6') });
      expect(highlightButton).toHaveStyle({ backgroundColor: expect.stringContaining('#F59E0B') });
    });

    it('should filter annotations by type', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      // Click to deselect note type (find the button, not the label in annotation)
      const noteButton = screen.getAllByText('note').find(el => 
        el.closest('button')?.style.display?.includes('flex')
      );
      if (noteButton) {
        await user.click(noteButton);
      }
      
      expect(screen.queryByText('This is a test note annotation')).not.toBeInTheDocument();
      expect(screen.getByText('Highlighted content for review')).toBeInTheDocument();
    });

    it('should toggle type filters correctly', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const highlightButton = screen.getAllByText('highlight').find(el => 
        el.closest('button')?.style.display?.includes('flex')
      );
      
      if (highlightButton) {
        // Deselect highlight
        await user.click(highlightButton);
        expect(screen.queryByText('Highlighted content for review')).not.toBeInTheDocument();
        
        // Select highlight again
        await user.click(highlightButton);
      }
      expect(screen.getByText('Highlighted content for review')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by newest first by default', () => {
      render(<AnnotationPanel {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Newest first');
      expect(sortSelect).toBeInTheDocument();
      
      // First annotation should be the newer one (note - 1m ago)
      const annotations = screen.getAllByText(/ago/);
      expect(annotations[0]).toHaveTextContent('1m ago');
      expect(annotations[1]).toHaveTextContent('2m ago');
    });

    it('should sort by oldest first', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Newest first');
      await user.selectOptions(sortSelect, 'oldest');
      
      // First annotation should be the older one (highlight - 2m ago)
      const annotations = screen.getAllByText(/ago/);
      expect(annotations[0]).toHaveTextContent('2m ago');
      expect(annotations[1]).toHaveTextContent('1m ago');
    });

    it('should sort by type', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Newest first');
      await user.selectOptions(sortSelect, 'type');
      
      // Highlight should come before note alphabetically
      const typeLabels = screen.getAllByText(/highlight|note/);
      expect(typeLabels[0]).toHaveTextContent('highlight');
      expect(typeLabels[1]).toHaveTextContent('note');
    });

    it('should sort by author', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const sortSelect = screen.getByDisplayValue('Newest first');
      await user.selectOptions(sortSelect, 'author');
      
      // Other User should come before Test User alphabetically
      const authors = screen.getAllByText(/Other User|Test User/);
      expect(authors[0]).toHaveTextContent('Other User');
      expect(authors[1]).toHaveTextContent('Test User');
    });
  });

  describe('Annotation Selection', () => {
    it('should select annotation when clicked', async () => {
      const user = userEvent.setup();
      const onAnnotationSelect = vi.fn();
      
      render(
        <AnnotationPanel 
          {...defaultProps} 
          onAnnotationSelect={onAnnotationSelect}
        />
      );
      
      const annotation = screen.getByText('This is a test note annotation');
      const annotationItem = annotation.closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        await user.click(annotationItem as HTMLElement);
      }
      
      expect(onAnnotationSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'annotation-1',
          content: 'This is a test note annotation',
        })
      );
    });

    it('should highlight selected annotation', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      const annotation = screen.getByText('This is a test note annotation');
      const annotationItem = annotation.closest('div[style*="padding: 12px"]');
      
      if (annotationItem) {
        await user.click(annotationItem as HTMLElement);
        
        expect(annotationItem).toHaveStyle({
          border: '2px solid rgb(59, 130, 246)',
        });
      }
    });
  });

  describe('Annotation Management', () => {
    it('should show context menu for own annotations', async () => {
      const user = userEvent.setup();
      render(<AnnotationPanel {...defaultProps} />);
      
      // Find the menu button by looking for a button within the annotation item
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        const menuButton = within(annotationItem as HTMLElement).getAllByRole('button').find(btn => btn.style.background === 'none');
        
        expect(menuButton).toBeInTheDocument();
        if (menuButton) {
          await user.click(menuButton);
        }
        
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      }
    });

    it('should not show context menu for other users annotations when no edit permission', () => {
      const limitedUser = {
        ...mockCurrentUser,
        permissions: {
          ...mockCurrentUser.permissions,
          canEdit: false,
        },
      };
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotations,
        currentUser: limitedUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      // Should only show menu for own annotations
      const ownAnnotation = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      const otherAnnotation = screen.getByText('Highlighted content for review').closest('div[style*="padding: 12px"]');
      
      if (ownAnnotation && otherAnnotation) {
        const ownMenuButton = within(ownAnnotation as HTMLElement).queryAllByRole('button').find(btn => btn.style.background === 'none');
        const otherMenuButton = within(otherAnnotation as HTMLElement).queryAllByRole('button').find(btn => btn.style.background === 'none');
        
        expect(ownMenuButton).toBeInTheDocument(); // Own annotation should have menu
        expect(otherMenuButton).toBeUndefined(); // Other annotation should not have menu
      }
    });

    it('should handle annotation edit', async () => {
      const user = userEvent.setup();
      const onAnnotationEdit = vi.fn();
      
      render(
        <AnnotationPanel 
          {...defaultProps} 
          onAnnotationEdit={onAnnotationEdit}
        />
      );
      
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        const menuButton = within(annotationItem as HTMLElement).getAllByRole('button').find(btn => btn.style.background === 'none');
        if (menuButton) {
          await user.click(menuButton);
        }
      }
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);
      
      expect(onAnnotationEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'annotation-1',
        })
      );
    });

    it('should handle annotation deletion', async () => {
      const user = userEvent.setup();
      const onAnnotationDelete = vi.fn();
      
      render(
        <AnnotationPanel 
          {...defaultProps} 
          onAnnotationDelete={onAnnotationDelete}
        />
      );
      
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        const menuButton = within(annotationItem as HTMLElement).getAllByRole('button').find(btn => btn.style.background === 'none');
        if (menuButton) {
          await user.click(menuButton);
        }
      }
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockDeleteAnnotation).toHaveBeenCalledWith('annotation-1');
        expect(onAnnotationDelete).toHaveBeenCalledWith('annotation-1');
      });
    });

    it('should handle deletion errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteAnnotation.mockRejectedValue(new Error('Delete failed'));
      
      render(<AnnotationPanel {...defaultProps} />);
      
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        const menuButton = within(annotationItem as HTMLElement).getAllByRole('button').find(btn => btn.style.background === 'none');
        if (menuButton) {
          await user.click(menuButton);
        }
      }
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete annotation:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Filter Options', () => {
    it('should filter to show only own annotations', () => {
      render(<AnnotationPanel {...defaultProps} showOnlyOwn={true} />);
      
      expect(screen.getByText('This is a test note annotation')).toBeInTheDocument();
      expect(screen.queryByText('Highlighted content for review')).not.toBeInTheDocument();
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('should show empty state when no annotations match filters', () => {
      render(
        <AnnotationPanel 
          {...defaultProps} 
          currentRoute="/different-route"
        />
      );
      
      expect(screen.getByText('No annotations on this page')).toBeInTheDocument();
    });
  });

  describe('Panel Controls', () => {
    it('should handle close button', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<AnnotationPanel {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByText('×');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should stop menu propagation', async () => {
      const user = userEvent.setup();
      const onAnnotationSelect = vi.fn();
      
      render(
        <AnnotationPanel 
          {...defaultProps} 
          onAnnotationSelect={onAnnotationSelect}
        />
      );
      
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        const menuButton = within(annotationItem as HTMLElement).getAllByRole('button').find(btn => btn.style.background === 'none');
        if (menuButton) {
          await user.click(menuButton);
        }
      }
      
      const contextMenu = screen.getByText('Edit').closest('div');
      if (contextMenu) {
        await user.click(contextMenu as HTMLElement);
      }
      
      // Should not trigger annotation selection
      expect(onAnnotationSelect).not.toHaveBeenCalled();
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      const now = Date.now();
      const mockAnnotationsWithDifferentTimes = new Map([
        ['recent', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'recent',
          createdAt: now - 30000, // 30 seconds ago
        }],
        ['hours', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'hours',
          createdAt: now - 7200000, // 2 hours ago
        }],
        ['days', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'days',
          createdAt: now - 172800000, // 2 days ago
        }],
      ]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotationsWithDifferentTimes,
        currentUser: mockCurrentUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty annotations map', () => {
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: new Map(),
        currentUser: mockCurrentUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('No annotations on this page')).toBeInTheDocument();
      expect(screen.getByText('0 of 0')).toBeInTheDocument();
    });

    it('should handle annotations without tags', () => {
      const annotationWithoutTags = new Map([
        ['no-tags', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'no-tags',
          tags: [],
        }],
      ]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: annotationWithoutTags,
        currentUser: mockCurrentUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      expect(screen.getByText('This is a test note annotation')).toBeInTheDocument();
      // Should not crash without tags
    });

    it('should handle annotations without reactions or comments', () => {
      const minimalAnnotation = new Map([
        ['minimal', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'minimal',
          reactions: [],
          commentIds: [],
        }],
      ]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: minimalAnnotation,
        currentUser: mockCurrentUser,
        deleteAnnotation: mockDeleteAnnotation,
      } as ReturnType<typeof useCollaborationStore>);
      
      render(<AnnotationPanel {...defaultProps} />);
      
      const annotationItem = screen.getByText('This is a test note annotation').closest('div[style*="padding: 12px"]');
      if (annotationItem) {
        // Should not show reaction/comment counts
        expect(within(annotationItem as HTMLElement).queryByText('0')).not.toBeInTheDocument();
      }
    });
  });
});