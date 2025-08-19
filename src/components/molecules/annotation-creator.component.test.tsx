/**
 * Unit tests for AnnotationCreator component
 * Tests annotation creation UI, type selection, and form interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { AnnotationTarget, CollaborationUser } from '@/types/collaboration';

import { AnnotationCreator } from './annotation-creator';


// Mock collaboration store
const mockCreateAnnotation = vi.fn();
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
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
};

vi.mock('@/stores/collaboration-store', () => ({
  useCollaborationStore: () => ({
    createAnnotation: mockCreateAnnotation,
    currentUser: mockCurrentUser,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock data
const mockTarget: AnnotationTarget = {
  type: 'entity',
  id: 'A123456789',
  url: '/authors/A123456789',
  title: 'Test Author',
  context: { entityType: 'author' },
};

describe('AnnotationCreator', () => {
  const defaultProps = {
    target: mockTarget,
    position: { x: 200, y: 300 },
    isOpen: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAnnotation.mockResolvedValue('new-annotation-id');
  });

  describe('Rendering', () => {
    it('should render annotation creator when open', () => {
      render(<AnnotationCreator {...defaultProps} />);
      
      expect(screen.getByText('Create Annotation')).toBeInTheDocument();
      expect(screen.getByText('Annotating:')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<AnnotationCreator {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create Annotation')).not.toBeInTheDocument();
    });

    it('should position creator correctly', () => {
      render(<AnnotationCreator {...defaultProps} position={{ x: 150, y: 250 }} />);
      
      const creator = screen.getByTestId('annotation-creator');
      expect(creator).toHaveStyle({
        left: '150px',
        top: '250px',
      });
    });

    it('should show all annotation type options', () => {
      render(<AnnotationCreator {...defaultProps} />);
      
      expect(screen.getByText('Highlight')).toBeInTheDocument();
      expect(screen.getByText('Note')).toBeInTheDocument();
      expect(screen.getByText('Bookmark')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Todo')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Reference')).toBeInTheDocument();
    });
  });

  describe('Type Selection', () => {
    it('should select annotation type', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const bookmarkButton = screen.getByText('Bookmark');
      await user.click(bookmarkButton);
      
      expect(bookmarkButton.closest('button')).toHaveStyle({
        border: expect.stringContaining('#10B981'),
      });
    });

    it('should show initial type selection', () => {
      render(<AnnotationCreator {...defaultProps} initialType="warning" />);
      
      const warningButton = screen.getByText('Warning');
      expect(warningButton.closest('button')).toHaveStyle({
        border: expect.stringContaining('#EF4444'),
      });
    });

    it('should update placeholder based on selected type', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const questionButton = screen.getByText('Question');
      await user.click(questionButton);
      
      const textarea = screen.getByPlaceholderText('Write your question...');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Content Input', () => {
    it('should handle content input', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'This is my test annotation content');
      
      expect(textarea).toHaveValue('This is my test annotation content');
    });

    it('should show character count', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'Test content');
      
      expect(screen.getByText('12/500')).toBeInTheDocument();
    });

    it('should use initial content', () => {
      render(<AnnotationCreator {...defaultProps} initialContent="Initial content" />);
      
      const textarea = screen.getByDisplayValue('Initial content');
      expect(textarea).toBeInTheDocument();
    });

    it('should focus textarea on mount', () => {
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      expect(textarea).toHaveFocus();
    });
  });

  describe('Tag Management', () => {
    it('should add tags on Enter key', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter or comma to add)');
      await user.type(tagInput, 'research{enter}');
      
      expect(screen.getByText('research')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('should add tags on comma', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter or comma to add)');
      await user.type(tagInput, 'important,');
      
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should remove tags when clicked', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter or comma to add)');
      await user.type(tagInput, 'removeme{enter}');
      
      expect(screen.getByText('removeme')).toBeInTheDocument();
      
      const removeButton = screen.getByText('×');
      await user.click(removeButton);
      
      expect(screen.queryByText('removeme')).not.toBeInTheDocument();
    });

    it('should remove last tag on backspace when input is empty', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter or comma to add)');
      await user.type(tagInput, 'tag1{enter}tag2{enter}');
      
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      
      await user.keyboard('{backspace}');
      
      expect(screen.queryByText('tag2')).not.toBeInTheDocument();
      expect(screen.getByText('tag1')).toBeInTheDocument();
    });

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('Add tags (press Enter or comma to add)');
      await user.type(tagInput, 'duplicate{enter}duplicate{enter}');
      
      const duplicateTags = screen.getAllByText('duplicate');
      expect(duplicateTags).toHaveLength(1);
    });
  });

  describe('Form Actions', () => {
    it('should create annotation on submit', async () => {
      const user = userEvent.setup();
      const onAnnotationCreate = vi.fn();
      
      render(
        <AnnotationCreator 
          {...defaultProps} 
          onAnnotationCreate={onAnnotationCreate}
        />
      );
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'Test annotation content');
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockCreateAnnotation).toHaveBeenCalledWith({
          type: 'note',
          target: mockTarget,
          content: 'Test annotation content',
          author: {
            id: mockCurrentUser.id,
            name: mockCurrentUser.name,
            avatar: mockCurrentUser.avatar,
            colour: mockCurrentUser.colour,
          },
          visibility: 'team',
          status: 'published',
          tags: [],
          reactions: [],
          commentIds: [],
          position: {
            x: 200,
            y: 300,
            anchor: 'center',
          },
        });
      });
      
      expect(onAnnotationCreate).toHaveBeenCalledWith('new-annotation-id');
    });

    it('should disable create button when content is empty', () => {
      render(<AnnotationCreator {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when content is provided', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'Some content');
      
      const createButton = screen.getByText('Create');
      expect(createButton).not.toBeDisabled();
    });

    it('should handle cancel action', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<AnnotationCreator {...defaultProps} onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle close button', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<AnnotationCreator {...defaultProps} onCancel={onCancel} />);
      
      const closeButton = screen.getByText('×');
      await user.click(closeButton);
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error when content is missing', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      // Try to create without content
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should handle creation errors', async () => {
      const user = userEvent.setup();
      mockCreateAnnotation.mockRejectedValue(new Error('Creation failed'));
      
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'Test content');
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
      });
    });

    it('should show loading state during creation', async () => {
      const user = userEvent.setup();
      mockCreateAnnotation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, 'Test content');
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(createButton).toBeDisabled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<AnnotationCreator {...defaultProps} onCancel={onCancel} />);
      
      await user.keyboard('{Escape}');
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Outside Click', () => {
    it('should close on outside click', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(
        <div>
          <div data-testid="outside">Outside content</div>
          <AnnotationCreator {...defaultProps} onCancel={onCancel} />
        </div>
      );
      
      const outsideElement = screen.getByTestId('outside');
      await user.click(outsideElement);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('should not close on inside click', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<AnnotationCreator {...defaultProps} onCancel={onCancel} />);
      
      const creator = screen.getByTestId('annotation-creator');
      await user.click(creator);
      
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user without annotation permissions', () => {
      const userWithoutPermissions = {
        ...mockCurrentUser,
        permissions: {
          ...mockCurrentUser.permissions,
          canAnnotate: false,
        },
      };
      
      vi.mocked(require('@/stores/collaboration-store').useCollaborationStore).mockReturnValue({
        createAnnotation: mockCreateAnnotation,
        currentUser: userWithoutPermissions,
      });
      
      render(<AnnotationCreator {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should handle no current user', () => {
      vi.mocked(require('@/stores/collaboration-store').useCollaborationStore).mockReturnValue({
        createAnnotation: mockCreateAnnotation,
        currentUser: null,
      });
      
      render(<AnnotationCreator {...defaultProps} />);
      
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should trim whitespace from content', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, '  Content with spaces  ');
      
      const createButton = screen.getByText('Create');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockCreateAnnotation).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Content with spaces',
          })
        );
      });
    });

    it('should handle very long content', async () => {
      const user = userEvent.setup();
      render(<AnnotationCreator {...defaultProps} />);
      
      const longContent = 'a'.repeat(600); // Exceeds 500 character limit
      const textarea = screen.getByPlaceholderText('Write your note...');
      await user.type(textarea, longContent);
      
      expect(screen.getByText('600/500')).toBeInTheDocument();
    });
  });
});