/**
 * Component tests for UserSelection atom
 * Tests text selection highlighting, bounds calculation, and visual feedback
 */

import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { CollaborationUser, SelectionRange } from '@/types/collaboration';

import { UserSelection } from './user-selection';

// Mock framer-motion to avoid animation-related test issues
interface MockMotionDivProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  initial?: unknown;
  animate?: unknown;
  transition?: unknown;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, MockMotionDivProps>(({ children, style, ...props }, ref) => (
      <div ref={ref} style={style} {...props}>
        {children}
      </div>
    )),
  },
}));

// Test data
const mockUser: CollaborationUser = {
  id: 'user-123',
  name: 'Jane Smith',
  colour: '#10B981',
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

const mockTextSelection: SelectionRange = {
  start: { x: 100, y: 200 },
  end: { x: 300, y: 220 },
  content: 'This is selected text',
  type: 'text',
};

const mockElementSelection: SelectionRange = {
  start: { x: 50, y: 50 },
  end: { x: 350, y: 150 },
  type: 'element',
};

const mockInvalidSelection: SelectionRange = {
  start: { x: 100, y: 100 },
  end: { x: 100, y: 100 }, // Same point - invalid selection
  type: 'text',
};

const mockLongTextSelection: SelectionRange = {
  start: { x: 100, y: 200 },
  end: { x: 400, y: 240 },
  content: 'This is a very long piece of selected text that should be truncated in the label display to prevent UI overflow',
  type: 'text',
};

// Test utilities
const renderUserSelection = (props: Partial<React.ComponentProps<typeof UserSelection>> = {}) => {
  const defaultProps = {
    user: mockUser,
    selection: mockTextSelection,
  };
  return render(<UserSelection {...defaultProps} {...props} />);
};

describe('UserSelection Basic Rendering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render with valid selection', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });

  it('should not render with invalid selection (same start and end points)', () => {
    renderUserSelection({ selection: mockInvalidSelection });
    
    const selection = screen.queryByTestId('selection-user-123');
    expect(selection).not.toBeInTheDocument();
  });

  it('should not render when selection is undefined', () => {
    renderUserSelection({ selection: undefined as unknown as SelectionRange });
    
    const selection = screen.queryByTestId('selection-user-123');
    expect(selection).not.toBeInTheDocument();
  });

  it('should render with custom className', () => {
    renderUserSelection({ className: 'custom-selection' });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveClass('custom-selection');
  });

  it('should render with custom zIndex', () => {
    renderUserSelection({ zIndex: 1500 });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveStyle({ zIndex: '1500' });
  });
});

describe('UserSelection Bounds Calculation', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should calculate correct bounds for horizontal selection', () => {
    const horizontalSelection: SelectionRange = {
      start: { x: 100, y: 200 },
      end: { x: 300, y: 200 }, // Same Y, different X
      type: 'text',
    };
    renderUserSelection({ selection: horizontalSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    
    // The selection highlight should be positioned based on calculated bounds
    const highlight = selection.querySelector('div[style*="position: absolute"]');
    expect(highlight).toBeInTheDocument();
  });

  it('should calculate correct bounds for vertical selection', () => {
    const verticalSelection: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 100, y: 300 }, // Same X, different Y
      type: 'text',
    };
    renderUserSelection({ selection: verticalSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });

  it('should handle negative bounds (end before start)', () => {
    const reversedSelection: SelectionRange = {
      start: { x: 300, y: 200 },
      end: { x: 100, y: 150 }, // End is "before" start
      type: 'text',
    };
    renderUserSelection({ selection: reversedSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });

  it('should not render very small selections', () => {
    const tinySelection: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 101, y: 101 }, // 1x1 pixel selection
      type: 'text',
    };
    renderUserSelection({ selection: tinySelection });
    
    const selection = screen.queryByTestId('selection-user-123');
    expect(selection).not.toBeInTheDocument();
  });
});

describe('UserSelection Visual Components', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render selection highlight with correct opacity', () => {
    renderUserSelection({ opacity: 0.4 });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    
    // Check for highlight element
    const highlight = selection.querySelector('div[style*="backgroundColor"]');
    expect(highlight).toBeInTheDocument();
  });

  it('should render selection border', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    
    // Check for border element
    const border = selection.querySelector('div[style*="border"]');
    expect(border).toBeInTheDocument();
  });

  it('should render selection label with user name', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should render selection content in label', () => {
    renderUserSelection();
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('"This is selected text"')).toBeInTheDocument();
  });

  it('should truncate long selection content', () => {
    renderUserSelection({ selection: mockLongTextSelection });
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    // Should be truncated with ellipsis
    const contentElement = screen.getByText(/This is a very long piece/);
    expect(contentElement.textContent).toMatch(/\.\.\.$/);
  });

  it('should not display content when selection has no content', () => {
    const selectionWithoutContent: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 200, y: 150 },
      type: 'element',
    };
    renderUserSelection({ selection: selectionWithoutContent });
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText(/"/)).not.toBeInTheDocument();
  });
});

describe('UserSelection User Colours and Styling', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should use user colour for highlight', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    const highlight = selection.querySelector('div[style*="backgroundColor"]');
    
    expect(highlight).toHaveStyle({ backgroundColor: '#10B981' });
  });

  it('should use user colour for border', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    const border = selection.querySelector('div[style*="border:"]');
    
    expect(border).toHaveStyle({ border: '2px solid #10B981' });
  });

  it('should use user colour for label background', () => {
    renderUserSelection();
    
    const userNameElement = screen.getByText('Jane Smith');
    expect(userNameElement.closest('div')).toHaveStyle({ backgroundColor: '#10B981' });
  });

  it('should use user colour for label arrow', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    const arrow = selection.querySelector('div[style*="borderTop"]');
    
    expect(arrow).toHaveStyle({ borderTop: '4px solid #10B981' });
  });

  it('should handle different user colours', () => {
    const userWithDifferentColour = { ...mockUser, colour: '#EF4444' };
    renderUserSelection({ user: userWithDifferentColour });
    
    const selection = screen.getByTestId('selection-user-123');
    const highlight = selection.querySelector('div[style*="backgroundColor"]');
    
    expect(highlight).toHaveStyle({ backgroundColor: '#EF4444' });
  });
});

describe('UserSelection Label Positioning', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should position label above selection', () => {
    renderUserSelection();
    
    const userNameElement = screen.getByText('Jane Smith');
    const labelElement = userNameElement.closest('div');
    
    expect(labelElement).toHaveStyle({
      position: 'absolute',
      // Label should be positioned above the selection (top - 30)
    });
  });

  it('should handle label positioning for edge selections', () => {
    const edgeSelection: SelectionRange = {
      start: { x: 0, y: 0 },
      end: { x: 100, y: 20 },
      content: 'Edge selection',
      type: 'text',
    };
    renderUserSelection({ selection: edgeSelection });
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('"Edge selection"')).toBeInTheDocument();
  });

  it('should include arrow pointing to selection', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    const arrow = selection.querySelector('div[style*="borderTop"]');
    
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveStyle({
      position: 'absolute',
      left: '12px',
      bottom: '-4px',
    });
  });
});

describe('UserSelection Different Selection Types', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle text selection', () => {
    renderUserSelection({ selection: mockTextSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    expect(screen.getByText('"This is selected text"')).toBeInTheDocument();
  });

  it('should handle element selection', () => {
    renderUserSelection({ selection: mockElementSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should handle custom selection type', () => {
    const customSelection: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 200, y: 150 },
      content: 'Custom selection',
      type: 'custom',
    };
    renderUserSelection({ selection: customSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    expect(screen.getByText('"Custom selection"')).toBeInTheDocument();
  });
});

describe('UserSelection Accessibility and Behaviour', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should not interfere with pointer events', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveStyle({ pointerEvents: 'none' });
  });

  it('should use fixed positioning for viewport independence', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveStyle({ position: 'fixed' });
  });

  it('should span full viewport', () => {
    renderUserSelection();
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveStyle({
      width: '100%',
      height: '100%',
    });
  });

  it('should be positioned above other content', () => {
    renderUserSelection({ zIndex: 1200 });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toHaveStyle({ zIndex: '1200' });
  });
});

describe('UserSelection Different Users', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle different user IDs', () => {
    const user1 = { ...mockUser, id: 'user-1', name: 'Alice' };
    const user2 = { ...mockUser, id: 'user-2', name: 'Bob' };
    
    const { rerender } = renderUserSelection({ user: user1 });
    expect(screen.getByTestId('selection-user-1')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    
    rerender(<UserSelection user={user2} selection={mockTextSelection} />);
    expect(screen.getByTestId('selection-user-2')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should handle users with long names in label', () => {
    const userWithLongName = { 
      ...mockUser, 
      name: 'Dr. Elizabeth Margaret Thompson-Williams' 
    };
    renderUserSelection({ user: userWithLongName });
    
    expect(screen.getByText('Dr. Elizabeth Margaret Thompson-Williams')).toBeInTheDocument();
  });

  it('should handle users with special characters', () => {
    const userWithSpecialChars = { 
      ...mockUser, 
      name: 'María José García' 
    };
    renderUserSelection({ user: userWithSpecialChars });
    
    expect(screen.getByText('María José García')).toBeInTheDocument();
  });
});

describe('UserSelection Edge Cases', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle empty selection content', () => {
    const emptyContentSelection: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 200, y: 150 },
      content: '',
      type: 'text',
    };
    renderUserSelection({ selection: emptyContentSelection });
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('""')).not.toBeInTheDocument();
  });

  it('should handle very large selections', () => {
    const largeSelection: SelectionRange = {
      start: { x: 0, y: 0 },
      end: { x: 10000, y: 5000 },
      content: 'Large selection',
      type: 'text',
    };
    renderUserSelection({ selection: largeSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });

  it('should handle selections with negative coordinates', () => {
    const negativeSelection: SelectionRange = {
      start: { x: -100, y: -50 },
      end: { x: 100, y: 50 },
      content: 'Negative coordinates',
      type: 'text',
    };
    renderUserSelection({ selection: negativeSelection });
    
    const selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });

  it('should handle extreme opacity values', () => {
    const { rerender } = renderUserSelection({ opacity: 0 });
    let selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
    
    rerender(<UserSelection user={mockUser} selection={mockTextSelection} opacity={1} />);
    selection = screen.getByTestId('selection-user-123');
    expect(selection).toBeInTheDocument();
  });
});

describe('UserSelection Component Integration', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should work with multiple selection instances', () => {
    const user1 = { ...mockUser, id: 'user-1', name: 'Alice', colour: '#FF0000' };
    const user2 = { ...mockUser, id: 'user-2', name: 'Bob', colour: '#00FF00' };
    const selection1: SelectionRange = {
      start: { x: 100, y: 100 },
      end: { x: 200, y: 150 },
      content: 'Alice selection',
      type: 'text',
    };
    const selection2: SelectionRange = {
      start: { x: 300, y: 200 },
      end: { x: 400, y: 250 },
      content: 'Bob selection',
      type: 'text',
    };
    
    render(
      <>
        <UserSelection user={user1} selection={selection1} />
        <UserSelection user={user2} selection={selection2} />
      </>
    );
    
    expect(screen.getByTestId('selection-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('selection-user-2')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('"Alice selection"')).toBeInTheDocument();
    expect(screen.getByText('"Bob selection"')).toBeInTheDocument();
  });

  it('should handle rapid selection updates', () => {
    const { rerender } = renderUserSelection();
    
    // Simulate rapid selection updates
    for (let i = 0; i < 10; i++) {
      const selection: SelectionRange = {
        start: { x: i * 10, y: i * 10 },
        end: { x: i * 10 + 100, y: i * 10 + 50 },
        content: `Selection ${i}`,
        type: 'text',
      };
      rerender(<UserSelection user={mockUser} selection={selection} />);
    }
    
    const selectionElement = screen.getByTestId('selection-user-123');
    expect(selectionElement).toBeInTheDocument();
  });

  it('should handle selection clearing and restoring', () => {
    const { rerender } = renderUserSelection();
    
    // Clear selection
    rerender(<UserSelection user={mockUser} selection={mockInvalidSelection} />);
    expect(screen.queryByTestId('selection-user-123')).not.toBeInTheDocument();
    
    // Restore selection
    rerender(<UserSelection user={mockUser} selection={mockTextSelection} />);
    expect(screen.getByTestId('selection-user-123')).toBeInTheDocument();
  });
});