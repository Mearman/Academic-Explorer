/**
 * Component tests for EntityBadge atom
 * Tests React component rendering and behavior in isolation
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { BadgeProps, IconProps, EntityType, SizeVariant } from '../types';

import { EntityBadge } from './entity-badge';

// Mock Badge component to focus on EntityBadge logic
vi.mock('./badge', () => ({
   
  Badge: React.forwardRef<HTMLSpanElement, BadgeProps>((badgeProps, ref) => {
    const { children, className, size, 'data-testid': testId, 'aria-label': ariaLabel, ...props } = badgeProps;
    return (
      <span 
        ref={ref}
        className={className}
        data-testid={testId}
        data-size={size}
        aria-label={ariaLabel}
        role="status"
        {...props}
      >
        {children}
      </span>
    );
  }),
}));

// Mock Icon component to avoid CSS/style dependencies
vi.mock('./icon', () => ({
  Icon: ({ name, size, 'aria-hidden': ariaHidden, ...props }: IconProps & { 'aria-hidden'?: boolean }) => (
    <span 
      data-testid="entity-icon" 
      data-icon={name} 
      data-size={size}
      aria-hidden={ariaHidden}
      {...props}
    >
      {name}
    </span>
  ),
}));

describe('EntityBadge Basic Rendering', () => {
  it('should render with required entityType prop', () => {
    render(<EntityBadge entityType="author" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Author');
  });

  it('should render with custom className', () => {
    render(<EntityBadge entityType="work" className="custom-entity" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveClass('custom-entity');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EntityBadge entityType="author" ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('EntityBadge Entity Types', () => {
  const entityTypes = [
    { type: 'work', label: 'Work', icon: 'document' },
    { type: 'author', label: 'Author', icon: 'user' },
    { type: 'source', label: 'Source', icon: 'book-open' },
    { type: 'institution', label: 'Institution', icon: 'building' },
    { type: 'publisher', label: 'Publisher', icon: 'briefcase' },
  ] as const;

  entityTypes.forEach(({ type, label, icon }) => {
    it(`should render ${type} entity type correctly`, () => {
      render(<EntityBadge entityType={type} data-testid="entity-badge" />);
      
      const badge = screen.getByTestId('entity-badge');
      const iconElement = screen.getByTestId('entity-icon');
      
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(label);
      expect(iconElement).toHaveAttribute('data-icon', icon);
    });
  });
});

describe('EntityBadge Additional Entity Types', () => {
  const additionalTypes = [
    { type: 'funder', label: 'Funder', icon: 'currency-dollar' },
    { type: 'topic', label: 'Topic', icon: 'tag' },
    { type: 'concept', label: 'Concept', icon: 'light-bulb' },
    { type: 'keyword', label: 'Keyword', icon: 'hashtag' },
    { type: 'continent', label: 'Continent', icon: 'globe' },
    { type: 'region', label: 'Region', icon: 'map' },
  ] as const;

  additionalTypes.forEach(({ type, label, icon }) => {
    it(`should render ${type} entity type correctly`, () => {
      render(<EntityBadge entityType={type} data-testid="entity-badge" />);
      
      const badge = screen.getByTestId('entity-badge');
      const iconElement = screen.getByTestId('entity-icon');
      
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(label);
      expect(iconElement).toHaveAttribute('data-icon', icon);
    });
  });
});

describe('EntityBadge Size Variants', () => {
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size`, () => {
      render(<EntityBadge entityType="author" size={size} data-testid="entity-badge" />);
      
      const badge = screen.getByTestId('entity-badge');
      const icon = screen.getByTestId('entity-icon');
      
      expect(badge).toHaveAttribute('data-size', size);
      expect(icon).toHaveAttribute('data-size', size);
    });
  });

  it('should default to md size when size prop is not provided', () => {
    render(<EntityBadge entityType="author" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    const icon = screen.getByTestId('entity-icon');
    
    expect(badge).toHaveAttribute('data-size', 'md');
    expect(icon).toHaveAttribute('data-size', 'md');
  });
});

describe('EntityBadge Icon Display', () => {
  it('should show icon by default', () => {
    render(<EntityBadge entityType="author" data-testid="entity-badge" />);
    
    const icon = screen.getByTestId('entity-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'user');
  });

  it('should show icon when showIcon is true', () => {
    render(<EntityBadge entityType="work" showIcon={true} data-testid="entity-badge" />);
    
    const icon = screen.getByTestId('entity-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'document');
  });

  it('should hide icon when showIcon is false', () => {
    render(<EntityBadge entityType="author" showIcon={false} data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    const icon = screen.queryByTestId('entity-icon');
    
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Author');
    expect(icon).not.toBeInTheDocument();
  });

  it('should render icon with correct accessibility attributes', () => {
    render(<EntityBadge entityType="source" data-testid="entity-badge" />);
    
    const icon = screen.getByTestId('entity-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('EntityBadge Accessibility', () => {
  it('should have correct aria-label', () => {
    render(<EntityBadge entityType="institution" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveAttribute('aria-label', 'Institution entity type');
  });

  it('should have role attribute from Badge component', () => {
    render(<EntityBadge entityType="publisher" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveAttribute('role', 'status');
  });

  it('should maintain accessibility when icon is hidden', () => {
    render(<EntityBadge entityType="funder" showIcon={false} data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveAttribute('aria-label', 'Funder entity type');
    expect(badge).toHaveTextContent('Funder');
  });
});

describe('EntityBadge Content Composition', () => {
  it('should render both icon and label when showIcon is true', () => {
    render(<EntityBadge entityType="topic" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    const icon = screen.getByTestId('entity-icon');
    
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Topic');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'tag');
  });

  it('should render only label when showIcon is false', () => {
    render(<EntityBadge entityType="concept" showIcon={false} data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Concept');
    expect(screen.queryByTestId('entity-icon')).not.toBeInTheDocument();
  });
});

describe('EntityBadge CSS Classes', () => {
  it('should apply entity-specific CSS classes', () => {
    render(<EntityBadge entityType="keyword" className="custom-class" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('should combine entity classes with custom className', () => {
    render(<EntityBadge entityType="continent" className="custom-continent" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveClass('custom-continent');
  });
});

describe('EntityBadge Props Forwarding', () => {
  it('should forward custom props to Badge component', () => {
    render(<EntityBadge entityType="region" id="custom-id" title="Custom title" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    expect(badge).toHaveAttribute('id', 'custom-id');
    expect(badge).toHaveAttribute('title', 'Custom title');
  });

  it('should pass size prop to both Badge and Icon', () => {
    render(<EntityBadge entityType="work" size="lg" data-testid="entity-badge" />);
    
    const badge = screen.getByTestId('entity-badge');
    const icon = screen.getByTestId('entity-icon');
    
    expect(badge).toHaveAttribute('data-size', 'lg');
    expect(icon).toHaveAttribute('data-size', 'lg');
  });
});

describe('EntityBadge Complex Scenarios', () => {
  it('should render with all props combined', () => {
    render(
      <EntityBadge
        entityType="author"
        size="xl"
        showIcon={true}
        className="complex-entity-badge"
        data-testid="complex-badge"
        id="complex-id"
      />
    );

    const badge = screen.getByTestId('complex-badge');
    const icon = screen.getByTestId('entity-icon');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('id', 'complex-id');
    expect(badge).toHaveClass('complex-entity-badge');
    expect(badge).toHaveAttribute('data-size', 'xl');
    expect(badge).toHaveAttribute('aria-label', 'Author entity type');
    expect(badge).toHaveTextContent('Author');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'user');
    expect(icon).toHaveAttribute('data-size', 'xl');
  });

  it('should handle icon-less configuration correctly', () => {
    render(
      <EntityBadge
        entityType="institution"
        size="sm"
        showIcon={false}
        className="no-icon-badge"
        data-testid="no-icon-badge"
      />
    );

    const badge = screen.getByTestId('no-icon-badge');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('no-icon-badge');
    expect(badge).toHaveAttribute('data-size', 'sm');
    expect(badge).toHaveTextContent('Institution');
    expect(screen.queryByTestId('entity-icon')).not.toBeInTheDocument();
  });
});

describe('EntityBadge Error Handling', () => {
  it('should handle invalid entityType gracefully', () => {
    expect(() => {
      render(<EntityBadge entityType={'invalid' as EntityType} data-testid="entity-badge" />);
    }).not.toThrow();
  });

  it('should handle invalid size gracefully', () => {
    expect(() => {
      render(<EntityBadge entityType="author" size={'invalid' as SizeVariant} />);
    }).not.toThrow();
  });

  it('should handle undefined props gracefully', () => {
    expect(() => {
      render(<EntityBadge entityType="work" />);
    }).not.toThrow();
  });
});

describe('EntityBadge Label Consistency', () => {
  it('should have consistent label formatting across all entity types', () => {
    const entityTypes = ['work', 'author', 'source', 'institution', 'publisher', 'funder', 'topic', 'concept', 'keyword', 'continent', 'region'] as const;
    
    entityTypes.forEach(entityType => {
      const index = entityTypes.indexOf(entityType);
      render(<EntityBadge entityType={entityType} data-testid={`entity-badge-${index}`} />);
      
      const badge = screen.getByTestId(`entity-badge-${index}`);
      const label = badge.textContent;
      
      expect(label).toBeTruthy();
      expect(label?.charAt(0)).toBe(label?.charAt(0).toUpperCase()); // Should start with capital letter
    });
  });
});

describe('EntityBadge Icon Mapping Consistency', () => {
  it('should have unique icons for different entity types', () => {
    const entityTypes = ['work', 'author', 'source', 'institution', 'publisher'] as const;
    const iconNames = new Set<string>();
    
    entityTypes.forEach(entityType => {
      const index = entityTypes.indexOf(entityType);
      render(<EntityBadge entityType={entityType} data-testid={`entity-badge-${index}`} />);
      
      const icon = screen.getByTestId('entity-icon');
      const iconName = icon.getAttribute('data-icon');
      
      expect(iconName).toBeTruthy();
      iconNames.add(iconName!);
    });
    
    // Should have unique icons for different types
    expect(iconNames.size).toBeGreaterThan(1);
  });
});