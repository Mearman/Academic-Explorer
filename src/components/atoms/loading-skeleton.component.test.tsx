/**
 * Component tests for LoadingSkeleton atom
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import {
  LoadingSkeleton,
  SkeletonGroup,
  TextSkeleton,
  TitleSkeleton,
  ButtonSkeleton,
  AvatarSkeleton,
  BadgeSkeleton,
  CardSkeleton,
} from './loading-skeleton';

describe('LoadingSkeleton Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSkeleton data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render with custom className', () => {
      render(<LoadingSkeleton className="custom-skeleton" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<LoadingSkeleton ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Width Variants', () => {
    const widthVariants = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const;

    widthVariants.forEach(width => {
      it(`should render with ${width} width`, () => {
        render(<LoadingSkeleton width={width} data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toBeInTheDocument();
      });
    });

    it('should handle custom width string', () => {
      render(<LoadingSkeleton width="200px" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '200px' });
    });
  });

  describe('Height Variants', () => {
    const heightVariants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    heightVariants.forEach(height => {
      it(`should render with ${height} height`, () => {
        render(<LoadingSkeleton height={height} data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toBeInTheDocument();
      });
    });

    it('should handle custom height string', () => {
      render(<LoadingSkeleton height="50px" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ height: '50px' });
    });
  });

  describe('Shape Variants', () => {
    const shapes = ['rectangle', 'rounded', 'pill', 'circle', 'square'] as const;

    shapes.forEach(shape => {
      it(`should render with ${shape} shape`, () => {
        render(<LoadingSkeleton shape={shape} data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toBeInTheDocument();
      });
    });
  });

  describe('Animation Variants', () => {
    const animations = ['pulse', 'wave', 'none'] as const;

    animations.forEach(animation => {
      it(`should render with ${animation} animation`, () => {
        render(<LoadingSkeleton animation={animation} data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toBeInTheDocument();
      });
    });
  });

  describe('Preset Variants', () => {
    const presets = ['text', 'title', 'subtitle', 'button', 'avatar', 'badge', 'card'] as const;

    presets.forEach(preset => {
      it(`should render with ${preset} preset`, () => {
        render(<LoadingSkeleton preset={preset} data-testid="skeleton" />);
        
        const skeleton = screen.getByTestId('skeleton');
        expect(skeleton).toBeInTheDocument();
      });
    });

    it('should ignore individual props when preset is used', () => {
      render(
        <LoadingSkeleton 
          preset="avatar" 
          width="200px" 
          height="100px" 
          data-testid="skeleton" 
        />
      );
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
      // When preset is used, custom width/height should not be applied
      expect(skeleton).not.toHaveStyle({ width: '200px' });
      expect(skeleton).not.toHaveStyle({ height: '100px' });
    });
  });

  describe('Inline Display', () => {
    it('should render as inline when inline prop is true', () => {
      render(<LoadingSkeleton inline data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render as block when inline prop is false', () => {
      render(<LoadingSkeleton inline={false} data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden attribute', () => {
      render(<LoadingSkeleton data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not be focusable', () => {
      render(<LoadingSkeleton data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom styles when width is not a predefined variant', () => {
      render(<LoadingSkeleton width="250px" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '250px' });
    });

    it('should apply custom styles when height is not a predefined variant', () => {
      render(<LoadingSkeleton height="75px" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '75px' });
    });

    it('should apply multiple custom styles', () => {
      render(<LoadingSkeleton width="300px" height="80px" data-testid="skeleton" />);
      
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ 
        width: '300px',
        height: '80px'
      });
    });
  });
});

describe('SkeletonGroup Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<SkeletonGroup data-testid="skeleton-group" />);
      
      const group = screen.getByTestId('skeleton-group');
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render default number of lines', () => {
      render(<SkeletonGroup data-testid="skeleton-group" />);
      
      const group = screen.getByTestId('skeleton-group');
      // Default is 3 lines
      expect(group.children).toHaveLength(3);
    });

    it('should render custom number of lines', () => {
      render(<SkeletonGroup lines={5} data-testid="skeleton-group" />);
      
      const group = screen.getByTestId('skeleton-group');
      expect(group.children).toHaveLength(5);
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonGroup ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Custom Children', () => {
    it('should render custom children when provided', () => {
      render(
        <SkeletonGroup data-testid="skeleton-group">
          <LoadingSkeleton data-testid="custom-skeleton-1" />
          <LoadingSkeleton data-testid="custom-skeleton-2" />
        </SkeletonGroup>
      );
      
      const group = screen.getByTestId('skeleton-group');
      expect(group.children).toHaveLength(2);
      expect(screen.getByTestId('custom-skeleton-1')).toBeInTheDocument();
      expect(screen.getByTestId('custom-skeleton-2')).toBeInTheDocument();
    });

    it('should ignore lines prop when children are provided', () => {
      render(
        <SkeletonGroup lines={10} data-testid="skeleton-group">
          <LoadingSkeleton data-testid="custom-skeleton" />
        </SkeletonGroup>
      );
      
      const group = screen.getByTestId('skeleton-group');
      expect(group.children).toHaveLength(1);
      expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
    });
  });

  describe('Line Generation', () => {
    it('should make last line shorter than others', () => {
      render(<SkeletonGroup lines={3} data-testid="skeleton-group" />);
      
      const group = screen.getByTestId('skeleton-group');
      const children = Array.from(group.children);
      
      expect(children).toHaveLength(3);
      // All children should be div elements (LoadingSkeleton components)
      children.forEach(child => {
        expect(child.tagName).toBe('DIV');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden attribute', () => {
      render(<SkeletonGroup data-testid="skeleton-group" />);
      
      const group = screen.getByTestId('skeleton-group');
      expect(group).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('Preset Skeleton Components', () => {
  describe('TextSkeleton', () => {
    it('should render with text preset', () => {
      render(<TextSkeleton data-testid="text-skeleton" />);
      
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should accept additional props', () => {
      render(<TextSkeleton width="lg" className="custom-text" data-testid="text-skeleton" />);
      
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('custom-text');
    });
  });

  describe('TitleSkeleton', () => {
    it('should render with title preset', () => {
      render(<TitleSkeleton data-testid="title-skeleton" />);
      
      const skeleton = screen.getByTestId('title-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('ButtonSkeleton', () => {
    it('should render with button preset', () => {
      render(<ButtonSkeleton data-testid="button-skeleton" />);
      
      const skeleton = screen.getByTestId('button-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('AvatarSkeleton', () => {
    it('should render with avatar preset', () => {
      render(<AvatarSkeleton data-testid="avatar-skeleton" />);
      
      const skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('BadgeSkeleton', () => {
    it('should render with badge preset', () => {
      render(<BadgeSkeleton data-testid="badge-skeleton" />);
      
      const skeleton = screen.getByTestId('badge-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('CardSkeleton', () => {
    it('should render with card preset', () => {
      render(<CardSkeleton data-testid="card-skeleton" />);
      
      const skeleton = screen.getByTestId('card-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Props Inheritance', () => {
    it('should inherit props but not preset prop', () => {
      render(<TextSkeleton width="200px" animation="pulse" data-testid="text-skeleton" />);
      
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '200px' });
    });
  });
});

describe('Error Handling', () => {
  it('should handle invalid width gracefully', () => {
    expect(() => {
      render(<LoadingSkeleton width={undefined} data-testid="skeleton" />);
    }).not.toThrow();
  });

  it('should handle invalid height gracefully', () => {
    expect(() => {
      render(<LoadingSkeleton height={undefined} data-testid="skeleton" />);
    }).not.toThrow();
  });

  it('should handle invalid preset gracefully', () => {
    expect(() => {
      render(<LoadingSkeleton preset={'invalid' as any} data-testid="skeleton" />);
    }).not.toThrow();
  });

  it('should handle zero lines in SkeletonGroup', () => {
    render(<SkeletonGroup lines={0} data-testid="skeleton-group" />);
    
    const group = screen.getByTestId('skeleton-group');
    expect(group.children).toHaveLength(0);
  });

  it('should handle negative lines in SkeletonGroup', () => {
    render(<SkeletonGroup lines={-1} data-testid="skeleton-group" />);
    
    const group = screen.getByTestId('skeleton-group');
    expect(group.children).toHaveLength(0);
  });
});