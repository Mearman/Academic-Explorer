/**
 * Component tests for PresenceIndicator molecule
 * Tests user presence display, avatars, status indicators, and interactions
 */

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { CollaborationUser } from '@/types/collaboration';

import { PresenceIndicator } from './presence-indicator';

// Mock framer-motion to avoid animation-related test issues
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, style, initial, animate, transition, whileHover, whileTap, onClick, ...props }, ref) => (
      <div ref={ref} style={style} onClick={onClick} {...props}>
        {children}
      </div>
    )),
    span: React.forwardRef<HTMLSpanElement, any>(({ children, style, initial, animate, transition, ...props }, ref) => (
      <span ref={ref} style={style} {...props}>
        {children}
      </span>
    )),
  },
}));

// Test data
const mockUserWithAvatar: CollaborationUser = {
  id: 'user-123',
  name: 'John Doe',
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

const mockUserWithoutAvatar: CollaborationUser = {
  id: 'user-456',
  name: 'Jane Smith',
  colour: '#10B981',
  status: 'away',
  lastSeen: Date.now() - 300000, // 5 minutes ago
  permissions: {
    canView: true,
    canAnnotate: false,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
};

const mockOfflineUser: CollaborationUser = {
  id: 'user-789',
  name: 'Bob Wilson',
  colour: '#EF4444',
  status: 'offline',
  lastSeen: Date.now() - 3600000, // 1 hour ago
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: true,
    canAdmin: true,
  },
};

// Test utilities
const renderPresenceIndicator = (props: Partial<React.ComponentProps<typeof PresenceIndicator>> = {}) => {
  const defaultProps = {
    user: mockUserWithAvatar,
  };
  return render(<PresenceIndicator {...defaultProps} {...props} />);
};

describe('PresenceIndicator Basic Rendering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    renderPresenceIndicator();
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toBeInTheDocument();
  });

  it('should render user avatar when available', () => {
    renderPresenceIndicator();
    
    const avatar = screen.getByAltText('John Doe avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should render user initials when avatar is not available', () => {
    renderPresenceIndicator({ user: mockUserWithoutAvatar });
    
    const initials = screen.getByText('J');
    expect(initials).toBeInTheDocument();
  });

  it('should render user name by default', () => {
    renderPresenceIndicator();
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should hide user name when showName is false', () => {
    renderPresenceIndicator({ showName: false });
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should render with custom className', () => {
    renderPresenceIndicator({ className: 'custom-presence' });
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toHaveClass('custom-presence');
  });
});

describe('PresenceIndicator Size Variants', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const sizes = ['small', 'medium', 'large'] as const;

  sizes.forEach(size => {
    it(`should render with ${size} size variant`, () => {
      renderPresenceIndicator({ size });
      
      const indicator = screen.getByTestId('presence-user-123');
      expect(indicator).toBeInTheDocument();
      
      // Check avatar size based on configuration
      const avatar = indicator.querySelector('div[style*="width"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  it('should default to medium size', () => {
    renderPresenceIndicator();
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toBeInTheDocument();
  });

  it('should apply correct font sizes for different sizes', () => {
    const { rerender } = renderPresenceIndicator({ size: 'small' });
    let nameLabel = screen.getByText('John Doe');
    expect(nameLabel).toHaveStyle({ fontSize: '12px' });
    
    rerender(<PresenceIndicator user={mockUserWithAvatar} size="large" />);
    nameLabel = screen.getByText('John Doe');
    expect(nameLabel).toHaveStyle({ fontSize: '16px' });
  });
});

describe('PresenceIndicator Status Display', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should show online status indicator', () => {
    renderPresenceIndicator({ user: mockUserWithAvatar });
    
    const statusIndicator = screen.getByTestId('status-online');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveStyle({ backgroundColor: '#10B981' });
  });

  it('should show away status indicator', () => {
    renderPresenceIndicator({ user: mockUserWithoutAvatar });
    
    const statusIndicator = screen.getByTestId('status-away');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveStyle({ backgroundColor: '#F59E0B' });
  });

  it('should show offline status indicator', () => {
    renderPresenceIndicator({ user: mockOfflineUser });
    
    const statusIndicator = screen.getByTestId('status-offline');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveStyle({ backgroundColor: '#6B7280' });
  });

  it('should hide status indicator when showStatus is false', () => {
    renderPresenceIndicator({ showStatus: false });
    
    const statusIndicator = screen.queryByTestId('status-online');
    expect(statusIndicator).not.toBeInTheDocument();
  });

  it('should position status indicator correctly', () => {
    renderPresenceIndicator();
    
    const statusIndicator = screen.getByTestId('status-online');
    expect(statusIndicator).toHaveStyle({
      position: 'absolute',
      bottom: '2px',
      right: '2px',
    });
  });
});

describe('PresenceIndicator Avatar Display', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render avatar image when URL is provided', () => {
    renderPresenceIndicator({ user: mockUserWithAvatar });
    
    const avatar = screen.getByAltText('John Doe avatar');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(avatar).toHaveStyle({
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    });
  });

  it('should render initials when no avatar URL is provided', () => {
    renderPresenceIndicator({ user: mockUserWithoutAvatar });
    
    const initials = screen.getByText('J');
    expect(initials).toBeInTheDocument();
    expect(initials).toHaveStyle({
      color: 'white',
      fontWeight: '600',
      textTransform: 'uppercase',
    });
  });

  it('should use user colour for avatar background', () => {
    renderPresenceIndicator({ user: mockUserWithoutAvatar });
    
    const avatarContainer = screen.getByText('J').parentElement;
    expect(avatarContainer).toHaveStyle({
      backgroundColor: '#10B981',
    });
  });

  it('should handle long names for initials', () => {
    const userWithLongName = {
      ...mockUserWithoutAvatar,
      name: 'Alexander-Benedict',
    };
    renderPresenceIndicator({ user: userWithLongName });
    
    const initials = screen.getByText('A');
    expect(initials).toBeInTheDocument();
  });

  it('should handle empty names gracefully', () => {
    const userWithEmptyName = {
      ...mockUserWithoutAvatar,
      name: '',
    };
    
    expect(() => {
      renderPresenceIndicator({ user: userWithEmptyName });
    }).not.toThrow();
  });

  it('should apply correct border and shadow to avatar', () => {
    renderPresenceIndicator();
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    expect(avatarContainer).toHaveStyle({
      border: '2px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    });
  });
});

describe('PresenceIndicator Click Interactions', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should call onClick when avatar is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderPresenceIndicator({ onClick: handleClick });
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    if (avatarContainer) {
      await user.click(avatarContainer);
    }
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should show pointer cursor when clickable', () => {
    const handleClick = vi.fn();
    renderPresenceIndicator({ onClick: handleClick });
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    expect(avatarContainer).toHaveStyle({ cursor: 'pointer' });
  });

  it('should show default cursor when not clickable', () => {
    renderPresenceIndicator();
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    expect(avatarContainer).toHaveStyle({ cursor: 'default' });
  });

  it('should handle click events on initials avatar', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderPresenceIndicator({ 
      user: mockUserWithoutAvatar, 
      onClick: handleClick 
    });
    
    const initialsContainer = screen.getByText('J').parentElement;
    if (initialsContainer) {
      await user.click(initialsContainer);
    }
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('PresenceIndicator Name Display', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display user name with correct styling', () => {
    renderPresenceIndicator();
    
    const nameLabel = screen.getByText('John Doe');
    expect(nameLabel).toHaveStyle({
      fontSize: '14px',
      fontWeight: '500',
      color: '#3B82F6',
      marginLeft: '8px',
      whiteSpace: 'nowrap',
    });
  });

  it('should use user colour for name text', () => {
    renderPresenceIndicator({ user: mockUserWithoutAvatar });
    
    const nameLabel = screen.getByText('Jane Smith');
    expect(nameLabel).toHaveStyle({ color: '#10B981' });
  });

  it('should handle long names without wrapping', () => {
    const userWithLongName = {
      ...mockUserWithAvatar,
      name: 'Dr. Alexander Maximilian Richardson-Williams III',
    };
    renderPresenceIndicator({ user: userWithLongName });
    
    const nameLabel = screen.getByText('Dr. Alexander Maximilian Richardson-Williams III');
    expect(nameLabel).toHaveStyle({ whiteSpace: 'nowrap' });
  });

  it('should handle names with special characters', () => {
    const userWithSpecialChars = {
      ...mockUserWithAvatar,
      name: 'José María García-López',
    };
    renderPresenceIndicator({ user: userWithSpecialChars });
    
    expect(screen.getByText('José María García-López')).toBeInTheDocument();
  });
});

describe('PresenceIndicator Layout and Positioning', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should use flex layout for horizontal arrangement', () => {
    renderPresenceIndicator();
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
    });
  });

  it('should position avatar container relatively for status indicator', () => {
    renderPresenceIndicator();
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement?.parentElement;
    expect(avatarContainer).toHaveStyle({ position: 'relative' });
  });

  it('should maintain consistent spacing between avatar and name', () => {
    renderPresenceIndicator();
    
    const nameLabel = screen.getByText('John Doe');
    expect(nameLabel).toHaveStyle({ marginLeft: '8px' });
  });
});

describe('PresenceIndicator Different User States', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render different users with unique test IDs', () => {
    const user1 = { ...mockUserWithAvatar, id: 'user-1', name: 'Alice' };
    const user2 = { ...mockUserWithoutAvatar, id: 'user-2', name: 'Bob' };
    
    const { rerender } = renderPresenceIndicator({ user: user1 });
    expect(screen.getByTestId('presence-user-1')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    
    rerender(<PresenceIndicator user={user2} />);
    expect(screen.getByTestId('presence-user-2')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should handle users with different permission levels', () => {
    const adminUser = {
      ...mockUserWithAvatar,
      permissions: {
        canView: true,
        canAnnotate: true,
        canEdit: true,
        canInvite: true,
        canAdmin: true,
      },
    };
    renderPresenceIndicator({ user: adminUser });
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toBeInTheDocument();
  });

  it('should render consistently regardless of lastSeen timestamp', () => {
    const recentUser = {
      ...mockUserWithAvatar,
      lastSeen: Date.now(),
    };
    const oldUser = {
      ...mockUserWithAvatar,
      lastSeen: Date.now() - 86400000, // 24 hours ago
    };
    
    const { rerender } = renderPresenceIndicator({ user: recentUser });
    expect(screen.getByTestId('presence-user-123')).toBeInTheDocument();
    
    rerender(<PresenceIndicator user={oldUser} />);
    expect(screen.getByTestId('presence-user-123')).toBeInTheDocument();
  });
});

describe('PresenceIndicator Accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should provide proper alt text for avatar images', () => {
    renderPresenceIndicator();
    
    const avatar = screen.getByAltText('John Doe avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('should be keyboard accessible when clickable', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderPresenceIndicator({ onClick: handleClick });
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    
    // Should be focusable and clickable
    if (avatarContainer) {
      avatarContainer.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('should have proper semantic structure', () => {
    renderPresenceIndicator();
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toBeInTheDocument();
    
    // Should contain both visual (avatar) and textual (name) information
    expect(screen.getByAltText('John Doe avatar')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

describe('PresenceIndicator Edge Cases', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle missing user properties gracefully', () => {
    const incompleteUser = {
      id: 'incomplete-user',
      name: 'Incomplete User',
      colour: '#000000',
      status: 'online' as const,
      lastSeen: Date.now(),
      permissions: {
        canView: true,
        canAnnotate: false,
        canEdit: false,
        canInvite: false,
        canAdmin: false,
      },
    };
    
    expect(() => {
      renderPresenceIndicator({ user: incompleteUser });
    }).not.toThrow();
  });

  it('should handle invalid avatar URLs gracefully', () => {
    const userWithInvalidAvatar = {
      ...mockUserWithAvatar,
      avatar: 'invalid-url',
    };
    
    expect(() => {
      renderPresenceIndicator({ user: userWithInvalidAvatar });
    }).not.toThrow();
  });

  it('should handle undefined onClick gracefully', async () => {
    const user = userEvent.setup();
    renderPresenceIndicator({ onClick: undefined });
    
    const avatarContainer = screen.getByAltText('John Doe avatar').parentElement;
    
    expect(() => {
      if (avatarContainer) {
        user.click(avatarContainer);
      }
    }).not.toThrow();
  });

  it('should handle very long user names', () => {
    const userWithVeryLongName = {
      ...mockUserWithAvatar,
      name: 'This is an extremely long user name that could potentially cause layout issues in the presence indicator component',
    };
    
    renderPresenceIndicator({ user: userWithVeryLongName });
    
    const nameLabel = screen.getByText(userWithVeryLongName.name);
    expect(nameLabel).toHaveStyle({ whiteSpace: 'nowrap' });
  });
});

describe('PresenceIndicator Component Integration', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should work with multiple presence indicators', () => {
    const users = [
      { ...mockUserWithAvatar, id: 'user-1', name: 'User 1', colour: '#FF0000' },
      { ...mockUserWithoutAvatar, id: 'user-2', name: 'User 2', colour: '#00FF00' },
      { ...mockOfflineUser, id: 'user-3', name: 'User 3', colour: '#0000FF' },
    ];
    
    render(
      <>
        {users.map(user => (
          <PresenceIndicator key={user.id} user={user} />
        ))}
      </>
    );
    
    expect(screen.getByTestId('presence-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('presence-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('presence-user-3')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText('User 3')).toBeInTheDocument();
  });

  it('should handle rapid user updates', () => {
    const { rerender } = renderPresenceIndicator();
    
    // Simulate rapid user status changes
    const statuses = ['online', 'away', 'offline'] as const;
    statuses.forEach(status => {
      const updatedUser = { ...mockUserWithAvatar, status };
      rerender(<PresenceIndicator user={updatedUser} />);
    });
    
    const indicator = screen.getByTestId('presence-user-123');
    expect(indicator).toBeInTheDocument();
  });

  it('should maintain state during prop changes', () => {
    const { rerender } = renderPresenceIndicator({ size: 'small', showName: true });
    
    // Change user but keep other props
    rerender(<PresenceIndicator user={mockUserWithoutAvatar} size="small" showName={true} />);
    
    expect(screen.getByTestId('presence-user-456')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});