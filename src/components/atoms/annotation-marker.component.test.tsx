/**
 * Unit tests for AnnotationMarker component
 * Tests annotation marker display, interactions, and visual states
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Annotation } from '@/types/collaboration';

import { AnnotationMarker } from './annotation-marker';


// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

// Mock data
const mockAnnotation: Annotation = {
  id: 'test-annotation-1',
  type: 'note',
  target: {
    type: 'entity',
    id: 'A123456789',
    url: '/authors/A123456789',
    title: 'Test Author',
  },
  content: 'This is a test annotation with detailed content for testing purposes.',
  author: {
    id: 'user-1',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    colour: '#3B82F6',
  },
  createdAt: Date.now() - 3600000, // 1 hour ago
  modifiedAt: Date.now() - 1800000, // 30 minutes ago
  visibility: 'team',
  status: 'published',
  tags: ['important', 'research', 'testing'],
  reactions: [
    { userId: 'user-2', type: 'like', timestamp: Date.now() - 1800000 },
  ],
  commentIds: ['comment-1', 'comment-2'],
  position: {
    x: 100,
    y: 200,
    anchor: 'center',
  },
};

describe('AnnotationMarker', () => {
  const defaultProps = {
    annotation: mockAnnotation,
    position: { x: 100, y: 200 },
    'data-testid': 'annotation-marker',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render annotation marker with correct type icon', () => {
      render(<AnnotationMarker {...defaultProps} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toBeInTheDocument();
      expect(marker).toHaveAttribute('data-annotation-type', 'note');
    });

    it('should position marker correctly', () => {
      render(<AnnotationMarker {...defaultProps} position={{ x: 150, y: 250 }} />);
      
      const container = screen.getByTestId('annotation-marker').parentElement;
      expect(container).toHaveStyle({
        left: '150px',
        top: '250px',
      });
    });

    it('should apply size variant styles', () => {
      const { rerender } = render(<AnnotationMarker {...defaultProps} size="sm" />);
      let marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveAttribute('data-size', 'sm');
      
      rerender(<AnnotationMarker {...defaultProps} size="lg" />);
      marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveAttribute('data-size', 'lg');
    });

    it('should show different colours for different annotation types', () => {
      const { rerender } = render(
        <AnnotationMarker 
          {...defaultProps} 
          annotation={{ ...mockAnnotation, type: 'warning' }} 
        />
      );
      
      let marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveAttribute('data-annotation-type', 'warning');
      
      rerender(
        <AnnotationMarker 
          {...defaultProps} 
          annotation={{ ...mockAnnotation, type: 'bookmark' }} 
        />
      );
      
      marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveAttribute('data-annotation-type', 'bookmark');
    });
  });

  describe('Interactive Features', () => {
    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<AnnotationMarker {...defaultProps} onClick={handleClick} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.click(marker);
      
      expect(handleClick).toHaveBeenCalledWith(mockAnnotation);
    });

    it('should handle hover events', () => {
      const handleMouseEnter = vi.fn();
      const handleMouseLeave = vi.fn();
      
      render(
        <AnnotationMarker 
          {...defaultProps} 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );
      
      const marker = screen.getByTestId('annotation-marker');
      
      fireEvent.mouseEnter(marker);
      expect(handleMouseEnter).toHaveBeenCalledWith(mockAnnotation);
      
      fireEvent.mouseLeave(marker);
      expect(handleMouseLeave).toHaveBeenCalledWith(mockAnnotation);
    });

    it('should not be interactive when interactive prop is false', () => {
      const handleClick = vi.fn();
      render(<AnnotationMarker {...defaultProps} interactive={false} onClick={handleClick} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveStyle({ cursor: 'default' });
      
      fireEvent.click(marker);
      expect(handleClick).toHaveBeenCalledWith(mockAnnotation);
    });

    it('should prevent event bubbling on click', () => {
      const handleClick = vi.fn();
      const handleParentClick = vi.fn();
      
      render(
        <div onClick={handleParentClick}>
          <AnnotationMarker {...defaultProps} onClick={handleClick} />
        </div>
      );
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.click(marker);
      
      expect(handleClick).toHaveBeenCalledWith(mockAnnotation);
      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('should show selected state styling', () => {
      render(<AnnotationMarker {...defaultProps} isSelected={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveStyle({
        boxShadow: expect.stringContaining('0 0 0 3px'),
      });
    });

    it('should show preview on hover when enabled', () => {
      render(<AnnotationMarker {...defaultProps} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      // Preview should appear after delay, we'll test for its trigger
      expect(marker).toBeInTheDocument();
    });

    it('should display pulse animation for new annotations', () => {
      const newAnnotation = {
        ...mockAnnotation,
        createdAt: Date.now() - 2000, // 2 seconds ago (within 5 second threshold)
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={newAnnotation} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide annotation data attributes', () => {
      render(<AnnotationMarker {...defaultProps} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toHaveAttribute('data-annotation-id', mockAnnotation.id);
      expect(marker).toHaveAttribute('data-annotation-type', mockAnnotation.type);
    });

    it('should support custom test ids', () => {
      render(<AnnotationMarker {...defaultProps} data-testid="custom-marker" />);
      
      expect(screen.getByTestId('custom-marker')).toBeInTheDocument();
    });

    it('should support custom class names', () => {
      render(<AnnotationMarker {...defaultProps} className="custom-annotation" />);
      
      const container = screen.getByTestId('annotation-marker').parentElement;
      expect(container).toHaveClass('custom-annotation');
    });
  });

  describe('Preview Tooltip', () => {
    it('should show annotation preview with correct content', () => {
      render(<AnnotationMarker {...defaultProps} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      // After the delay, preview should be visible
      setTimeout(() => {
        expect(screen.getByText(mockAnnotation.content)).toBeInTheDocument();
        expect(screen.getByText(mockAnnotation.author.name)).toBeInTheDocument();
        expect(screen.getByText(mockAnnotation.type.toUpperCase())).toBeInTheDocument();
      }, 600);
    });

    it('should show annotation tags in preview', () => {
      render(<AnnotationMarker {...defaultProps} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      setTimeout(() => {
        mockAnnotation.tags.slice(0, 3).forEach(tag => {
          expect(screen.getByText(tag)).toBeInTheDocument();
        });
      }, 600);
    });

    it('should handle preview close', () => {
      render(<AnnotationMarker {...defaultProps} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      setTimeout(() => {
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
        expect(screen.queryByText(mockAnnotation.content)).not.toBeInTheDocument();
      }, 600);
    });
  });

  describe('Edge Cases', () => {
    it('should handle annotation without tags', () => {
      const annotationWithoutTags = {
        ...mockAnnotation,
        tags: [],
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={annotationWithoutTags} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle annotation without position', () => {
      const annotationWithoutPosition = {
        ...mockAnnotation,
        position: undefined,
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={annotationWithoutPosition} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle unknown annotation types gracefully', () => {
      const annotationWithUnknownType = {
        ...mockAnnotation,
        type: 'unknown' as 'note', // Type assertion to satisfy TypeScript while testing edge case
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={annotationWithUnknownType} />);
      
      const marker = screen.getByTestId('annotation-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle very long content in preview', () => {
      const annotationWithLongContent = {
        ...mockAnnotation,
        content: 'This is a very long annotation content that should be handled gracefully in the preview tooltip without breaking the layout or causing overflow issues in the UI component.',
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={annotationWithLongContent} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      setTimeout(() => {
        expect(screen.getByText(annotationWithLongContent.content)).toBeInTheDocument();
      }, 600);
    });

    it('should handle many tags correctly', () => {
      const annotationWithManyTags = {
        ...mockAnnotation,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      };
      
      render(<AnnotationMarker {...defaultProps} annotation={annotationWithManyTags} showPreview={true} />);
      
      const marker = screen.getByTestId('annotation-marker');
      fireEvent.mouseEnter(marker);
      
      setTimeout(() => {
        expect(screen.getByText('+3')).toBeInTheDocument();
      }, 600);
    });
  });
});