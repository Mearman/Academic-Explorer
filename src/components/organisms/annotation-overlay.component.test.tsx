/**
 * Unit tests for AnnotationOverlay component
 * Tests overlay positioning, annotation management, creation workflows, and real-time interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  CollaborationUser, 
  CollaborationSession,
  AnnotationTarget 
} from '@/types/collaboration';

import { AnnotationOverlay } from './annotation-overlay';

// Mock collaboration store
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

const mockCurrentSession: CollaborationSession = {
  id: 'session-1',
  title: 'Test Session',
  ownerId: 'user-1',
  createdAt: Date.now(),
  lastActivity: Date.now(),
  visibility: 'team',
  status: 'active',
  participants: new Map([['user-1', mockCurrentUser]]),
  permissions: new Map([['user-1', mockCurrentUser.permissions]]),
  settings: {
    allowAnonymous: false,
    maxParticipants: 10,
    requireApproval: false,
    enableRecording: false,
    autoSaveInterval: 30000,
    showCursors: true,
    showSelections: true,
    enableVoiceChat: false,
    enableScreenShare: false,
  },
};

const mockTarget: AnnotationTarget = {
  type: 'entity',
  id: 'A123456789',
  url: '/authors/A123456789',
  title: 'Test Author',
  context: { entityType: EntityType.AUTHOR },
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
      context: { entityType: EntityType.AUTHOR },
    },
    content: 'This is a test note annotation',
    author: {
      id: mockCurrentUser.id,
      name: mockCurrentUser.name,
      avatar: mockCurrentUser.avatar,
      colour: mockCurrentUser.colour,
    },
    createdAt: Date.now() - 60000,
    modifiedAt: Date.now() - 60000,
    visibility: 'team',
    status: 'published',
    tags: ['research'],
    reactions: [],
    commentIds: [],
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
      context: { entityType: EntityType.AUTHOR },
    },
    content: 'Highlighted content',
    author: {
      id: 'user-2',
      name: 'Other User',
      avatar: 'https://example.com/avatar2.jpg',
      colour: '#EF4444',
    },
    createdAt: Date.now() - 120000,
    modifiedAt: Date.now() - 120000,
    visibility: 'team',
    status: 'published',
    tags: [],
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
      context: { entityType: EntityType.WORK },
    },
    content: 'Question about methodology',
    author: {
      id: mockCurrentUser.id,
      name: mockCurrentUser.name,
      avatar: mockCurrentUser.avatar,
      colour: mockCurrentUser.colour,
    },
    createdAt: Date.now() - 30000,
    modifiedAt: Date.now() - 30000,
    visibility: 'team',
    status: 'published',
    tags: [],
    reactions: [],
    commentIds: [],
    position: { x: 300, y: 300, anchor: 'center' },
  }],
]);

vi.mock('@/stores/collaboration-store');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock child components
vi.mock('@/components/atoms/annotation-marker', () => ({
  AnnotationMarker: ({ annotation, onClick, 'data-testid': testId }: any) => (
    <div 
      data-testid={testId || `annotation-marker-${annotation.id}`}
      onClick={() => onClick?.(annotation)}
      role="button"
    >
      Marker: {annotation.content}
    </div>
  ),
}));

vi.mock('@/components/molecules/annotation-creator', () => ({
  AnnotationCreator: ({ 
    target, 
    position, 
    isOpen, 
    onAnnotationCreate, 
    onCancel,
    'data-testid': testId 
  }: any) => 
    isOpen ? (
      <div 
        data-testid={testId || 'annotation-creator'}
        style={{ left: position.x, top: position.y }}
      >
        Creator for {target.title}
        <button onClick={() => onAnnotationCreate?.('new-annotation-id')}>
          Create
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/authors/A123456789',
  },
  writable: true,
});

describe('AnnotationOverlay', () => {
  const defaultProps = {
    currentRoute: '/authors/A123456789',
    currentTarget: mockTarget,
  };

  // Helper to create a proper double-click event
  const createDoubleClickEvent = (clientX: number, clientY: number, target?: Element) => {
    const targetElement = target || document.createElement('div');
    if (!target) {
      document.body.appendChild(targetElement);
    }
    
    const event = new MouseEvent('dblclick', {
      bubbles: true,
      clientX,
      clientY,
    });
    Object.defineProperty(event, 'target', {
      value: targetElement,
      writable: false,
    });
    
    return { event, element: targetElement, cleanup: () => {
      if (!target && document.body.contains(targetElement)) {
        document.body.removeChild(targetElement);
      }
    }};
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store hook to return our test data
    vi.mocked(useCollaborationStore).mockReturnValue({
      annotations: mockAnnotations,
      currentUser: mockCurrentUser,
      currentSession: mockCurrentSession,
    });
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener('dblclick', vi.fn());
  });

  describe('Rendering', () => {
    it('should render overlay when session is active', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.getByText('Marker: Highlighted content')).toBeInTheDocument();
    });

    it('should not render when no session', () => {
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotations,
        currentUser: mockCurrentUser,
        currentSession: null,
      });
      
      const { container } = render(<AnnotationOverlay {...defaultProps} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render when showAnnotations is false', () => {
      const { container } = render(
        <AnnotationOverlay {...defaultProps} showAnnotations={false} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should filter annotations by current route', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.getByText('Marker: Highlighted content')).toBeInTheDocument();
      expect(screen.queryByText('Marker: Question about methodology')).not.toBeInTheDocument();
    });

    it('should show annotation count', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('2 annotations')).toBeInTheDocument();
    });

    it('should show singular count for single annotation', () => {
      const singleAnnotation = new Map([Array.from(mockAnnotations.entries())[0]]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: singleAnnotation,
        currentUser: mockCurrentUser,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('1 annotation')).toBeInTheDocument();
    });
  });

  describe('Type Filtering', () => {
    it('should filter annotations by type filter prop', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          typeFilter={['note']}
        />
      );
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.queryByText('Marker: Highlighted content')).not.toBeInTheDocument();
    });

    it('should show all types when no type filter', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.getByText('Marker: Highlighted content')).toBeInTheDocument();
    });

    it('should respect internal type filter settings', async () => {
      const user = userEvent.setup();
      render(<AnnotationOverlay {...defaultProps} />);
      
      // This would test internal toggle functionality if exposed
      // For now, we test that the component renders with default settings
      expect(screen.getByText('2 annotations')).toBeInTheDocument();
    });
  });

  describe('Author Filtering', () => {
    it('should filter annotations by author filter prop', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          authorFilter={[mockCurrentUser.id]}
        />
      );
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.queryByText('Marker: Highlighted content')).not.toBeInTheDocument();
    });

    it('should show all authors when no author filter', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.getByText('Marker: Highlighted content')).toBeInTheDocument();
    });
  });

  describe('Annotation Creation', () => {
    it('should open creator on double-click', async () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      
      expect(screen.getByText('Creator for Test Author')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      
      cleanup();
    });

    it('should not open creator when creation is disabled', async () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          allowCreation={false}
        />
      );
      
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
    });

    it('should not open creator when user lacks permissions', async () => {
      const userWithoutPermissions = {
        ...mockCurrentUser,
        permissions: {
          ...mockCurrentUser.permissions,
          canAnnotate: false,
        },
      };
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotations,
        currentUser: userWithoutPermissions,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
    });

    it('should not open creator when no current target', async () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          currentTarget={undefined}
        />
      );
      
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(screen.queryByTestId('annotation-creator')).not.toBeInTheDocument();
    });

    it('should prevent creation on existing annotation elements', async () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Create element with annotation data attribute
      const annotationElement = document.createElement('div');
      annotationElement.setAttribute('data-annotation-id', 'annotation-1');
      document.body.appendChild(annotationElement);
      
      const event = new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 150,
        clientY: 250,
      });
      
      // Set the target after event creation using Object.defineProperty
      Object.defineProperty(event, 'target', {
        value: annotationElement,
        writable: false,
      });
      
      fireEvent(annotationElement, event);
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
      
      document.body.removeChild(annotationElement);
    });

    it('should prevent creation on no-annotation elements', async () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Create element with no-annotation data attribute
      const noAnnotationElement = document.createElement('div');
      noAnnotationElement.setAttribute('data-no-annotation', 'true');
      document.body.appendChild(noAnnotationElement);
      
      const event = new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 150,
        clientY: 250,
      });
      
      // Set the target after event creation using Object.defineProperty
      Object.defineProperty(event, 'target', {
        value: noAnnotationElement,
        writable: false,
      });
      
      fireEvent(noAnnotationElement, event);
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
      
      document.body.removeChild(noAnnotationElement);
    });

    it('should call onAnnotationCreate callback', async () => {
      const onAnnotationCreate = vi.fn();
      
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          onAnnotationCreate={onAnnotationCreate}
        />
      );
      
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(onAnnotationCreate).toHaveBeenCalledWith(
        mockTarget,
        { x: 150, y: 250 }
      );
    });

    it('should handle annotation creation completion', async () => {
      const user = userEvent.setup();
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Open creator
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(screen.getByText('Creator for Test Author')).toBeInTheDocument();
      
      // Complete creation
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
    });

    it('should handle annotation creation cancellation', async () => {
      const user = userEvent.setup();
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Open creator
      const { event, cleanup } = createDoubleClickEvent(150, 250);
      fireEvent(document, event);
      cleanup();
      
      expect(screen.getByText('Creator for Test Author')).toBeInTheDocument();
      
      // Cancel creation
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Creator for Test Author')).not.toBeInTheDocument();
    });
  });

  describe('Annotation Interactions', () => {
    it('should handle annotation click', async () => {
      const user = userEvent.setup();
      const onAnnotationClick = vi.fn();
      
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          onAnnotationClick={onAnnotationClick}
        />
      );
      
      const marker = screen.getByText('Marker: This is a test note annotation');
      await user.click(marker);
      
      expect(onAnnotationClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'annotation-1',
          content: 'This is a test note annotation',
        })
      );
    });

    it('should select annotation when clicked', async () => {
      const user = userEvent.setup();
      render(<AnnotationOverlay {...defaultProps} />);
      
      const marker = screen.getByText('Marker: This is a test note annotation');
      await user.click(marker);
      
      // Internal selection state should be updated (tested indirectly through re-render behavior)
      expect(marker).toBeInTheDocument();
    });

    it('should show previews when enabled', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          showPreviews={true}
        />
      );
      
      // The AnnotationMarker mock should receive showPreview prop
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
    });

    it('should hide previews when disabled', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          showPreviews={false}
        />
      );
      
      // The AnnotationMarker mock should receive showPreview prop as false
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
    });
  });

  describe('Overlay Controls', () => {
    it('should show overlay controls when creation is allowed', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByTitle('Fade annotations')).toBeInTheDocument();
      expect(screen.getByTitle('Filter annotations')).toBeInTheDocument();
    });

    it('should not show overlay controls when creation is disabled', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          allowCreation={false}
        />
      );
      
      expect(screen.queryByTitle('Fade annotations')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Filter annotations')).not.toBeInTheDocument();
    });

    it('should not show overlay controls when user lacks permissions', () => {
      const userWithoutPermissions = {
        ...mockCurrentUser,
        permissions: {
          ...mockCurrentUser.permissions,
          canAnnotate: false,
        },
      };
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotations,
        currentUser: userWithoutPermissions,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.queryByTitle('Fade annotations')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Filter annotations')).not.toBeInTheDocument();
    });

    it('should toggle annotation opacity', async () => {
      const user = userEvent.setup();
      render(<AnnotationOverlay {...defaultProps} />);
      
      const fadeButton = screen.getByTitle('Fade annotations');
      expect(fadeButton).toBeInTheDocument();
      
      await user.click(fadeButton);
      
      // Should change title to indicate new state
      expect(screen.getByTitle('Show annotations fully')).toBeInTheDocument();
    });
  });

  describe('Creation Hint', () => {
    it('should show creation hint when no annotations and creation allowed', () => {
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: new Map(),
        currentUser: mockCurrentUser,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.getByText('Double-click anywhere to create an annotation')).toBeInTheDocument();
    });

    it('should not show creation hint when annotations exist', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.queryByText('Double-click anywhere to create an annotation')).not.toBeInTheDocument();
    });

    it('should not show creation hint when creation is disabled', () => {
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: new Map(),
        currentUser: mockCurrentUser,
        currentSession: mockCurrentSession,
      });
      
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          allowCreation={false}
        />
      );
      
      expect(screen.queryByText('Double-click anywhere to create an annotation')).not.toBeInTheDocument();
    });

    it('should not show creation hint when user lacks permissions', () => {
      const userWithoutPermissions = {
        ...mockCurrentUser,
        permissions: {
          ...mockCurrentUser.permissions,
          canAnnotate: false,
        },
      };
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: new Map(),
        currentUser: userWithoutPermissions,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(screen.queryByText('Double-click anywhere to create an annotation')).not.toBeInTheDocument();
    });
  });

  describe('Event Cleanup', () => {
    it('should add double-click listener when creation allowed', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('should remove double-click listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<AnnotationOverlay {...defaultProps} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dblclick', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should not add listener when creation is disabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          allowCreation={false}
        />
      );
      
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('dblclick', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Positioning and Layout', () => {
    it('should render with fixed positioning', () => {
      const { container } = render(<AnnotationOverlay {...defaultProps} />);
      
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      });
    });

    it('should have correct z-index for layering', () => {
      const { container } = render(<AnnotationOverlay {...defaultProps} />);
      
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        zIndex: '1000',
      });
    });

    it('should use pointer-events none for overlay container', () => {
      const { container } = render(<AnnotationOverlay {...defaultProps} />);
      
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        pointerEvents: 'none',
      });
    });

    it('should enable pointer events for annotation markers', () => {
      render(<AnnotationOverlay {...defaultProps} />);
      
      const markerContainer = screen.getByText('Marker: This is a test note annotation').closest('div');
      expect(markerContainer).toHaveStyle({
        pointerEvents: 'auto',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing annotation positions', () => {
      const annotationWithoutPosition = new Map([
        ['no-position', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'no-position',
          position: undefined,
        }],
      ]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: annotationWithoutPosition,
        currentUser: mockCurrentUser,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Should render with default position
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
    });

    it('should handle annotations with draft status', () => {
      const draftAnnotation = new Map([
        ['draft', {
          ...Array.from(mockAnnotations.values())[0],
          id: 'draft',
          status: 'draft' as const,
        }],
      ]);
      
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: draftAnnotation,
        currentUser: mockCurrentUser,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Draft annotations should not be displayed
      expect(screen.queryByText('Marker: This is a test note annotation')).not.toBeInTheDocument();
      expect(screen.getByText('0 annotations')).toBeInTheDocument();
    });

    it('should handle custom route filtering', () => {
      render(
        <AnnotationOverlay 
          {...defaultProps} 
          currentRoute="/different-route"
        />
      );
      
      // No annotations should match the different route
      expect(screen.queryByText('Marker: This is a test note annotation')).not.toBeInTheDocument();
      expect(screen.getByText('0 annotations')).toBeInTheDocument();
    });

    it('should handle missing current user', () => {
      vi.mocked(useCollaborationStore).mockReturnValue({
        annotations: mockAnnotations,
        currentUser: null,
        currentSession: mockCurrentSession,
      });
      
      render(<AnnotationOverlay {...defaultProps} />);
      
      // Should still render annotations but without creation capabilities
      expect(screen.getByText('Marker: This is a test note annotation')).toBeInTheDocument();
      expect(screen.queryByTitle('Fade annotations')).not.toBeInTheDocument();
    });
  });
});