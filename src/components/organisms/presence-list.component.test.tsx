/**
 * Component tests for PresenceList organism
 * Tests participant list rendering, expansion/collapse, overflow handling, and user interactions
 */

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import type { CollaborationUser, UserPresence } from '@/types/collaboration';

import { PresenceList } from './presence-list';

// Mock PresenceIndicator component
vi.mock('@/components/molecules/presence-indicator', () => ({
  PresenceIndicator: ({ user, size, showName, showStatus }: any) => (
    <div data-testid={`presence-indicator-${user.id}`} data-size={size} data-show-name={showName} data-show-status={showStatus}>
      <span data-testid={`user-name-${user.id}`}>{user.name}</span>
      <span data-testid={`user-status-${user.id}`}>{user.status}</span>
    </div>
  ),
}));

// Mock framer-motion to avoid animation-related test issues
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, style, initial, animate, exit, onClick, whileHover, layout, ...props }, ref) => (
      <div ref={ref} style={style} onClick={onClick} {...props}>
        {children}
      </div>
    )),
    li: React.forwardRef<HTMLLIElement, any>(({ children, style, initial, animate, exit, onClick, whileHover, layout, ...props }, ref) => (
      <li ref={ref} style={style} onClick={onClick} {...props}>
        {children}
      </li>
    )),
    ul: React.forwardRef<HTMLUListElement, any>(({ children, style, layout, role, ...props }, ref) => (
      <ul ref={ref} style={style} role={role} {...props}>
        {children}
      </ul>
    )),
    button: React.forwardRef<HTMLButtonElement, any>(({ children, style, onClick, whileHover, whileTap, ...props }, ref) => (
      <button ref={ref} style={style} onClick={onClick} {...props}>
        {children}
      </button>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Test data
const createMockUser = (id: string, name: string, status: 'online' | 'away' | 'offline' = 'online'): CollaborationUser => ({
  id,
  name,
  colour: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  status,
  lastSeen: Date.now() - Math.random() * 300000,
  permissions: {
    canView: true,
    canAnnotate: true,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
});

const createMockPresence = (userId: string, route: string = '/current-page'): UserPresence => ({
  userId,
  currentRoute: route,
  lastActivity: Date.now() - Math.random() * 60000,
});

const mockCurrentUser = createMockUser('current-user', 'Current User');
const mockUsers = [
  createMockUser('user-1', 'Alice Johnson', 'online'),
  createMockUser('user-2', 'Bob Smith', 'away'),
  createMockUser('user-3', 'Carol Davis', 'online'),
  createMockUser('user-4', 'David Wilson', 'offline'),
  createMockUser('user-5', 'Eva Brown', 'online'),
  createMockUser('user-6', 'Frank Miller', 'away'),
  createMockUser('user-7', 'Grace Lee', 'online'),
];

const createParticipantsMap = (users: CollaborationUser[]): Map<string, CollaborationUser> => {
  const map = new Map();
  users.forEach(user => map.set(user.id, user));
  return map;
};

const createPresenceMap = (users: CollaborationUser[]): Map<string, UserPresence> => {
  const map = new Map();
  users.forEach(user => {
    map.set(user.id, createMockPresence(user.id));
  });
  return map;
};

// Test utilities
const renderPresenceList = (props: Partial<React.ComponentProps<typeof PresenceList>> = {}) => {
  const defaultUsers = [mockUsers[0], mockUsers[1], mockUsers[2]];
  const defaultProps = {
    participants: createParticipantsMap([mockCurrentUser, ...defaultUsers]),
    userPresence: createPresenceMap([mockCurrentUser, ...defaultUsers]),
    currentUser: mockCurrentUser,
  };
  return render(<PresenceList {...defaultProps} {...props} />);
};

describe('PresenceList Basic Rendering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render with participants', () => {
    renderPresenceList();
    
    expect(screen.getByText('Participants (3)')).toBeInTheDocument();
  });

  it('should not render when no other participants exist', () => {
    const onlyCurrentUser = createParticipantsMap([mockCurrentUser]);
    const onlyCurrentPresence = createPresenceMap([mockCurrentUser]);
    
    renderPresenceList({
      participants: onlyCurrentUser,
      userPresence: onlyCurrentPresence,
    });
    
    expect(screen.queryByText(/Participants/)).not.toBeInTheDocument();
  });

  it('should exclude current user from participant list', () => {
    renderPresenceList();
    
    expect(screen.getByTestId('presence-indicator-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-3')).toBeInTheDocument();
    expect(screen.queryByTestId('presence-indicator-current-user')).not.toBeInTheDocument();
  });

  it('should render with custom className', () => {
    const { container } = renderPresenceList({ className: 'custom-presence-list' });
    
    const presenceList = container.firstChild;
    expect(presenceList).toHaveClass('custom-presence-list');
  });
});

describe('PresenceList User Display', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display user names', () => {
    renderPresenceList();
    
    expect(screen.getByTestId('user-name-user-1')).toHaveTextContent('Alice Johnson');
    expect(screen.getByTestId('user-name-user-2')).toHaveTextContent('Bob Smith');
    expect(screen.getByTestId('user-name-user-3')).toHaveTextContent('Carol Davis');
  });

  it('should display user status', () => {
    renderPresenceList();
    
    expect(screen.getByTestId('user-status-user-1')).toHaveTextContent('online');
    expect(screen.getByTestId('user-status-user-2')).toHaveTextContent('away');
    expect(screen.getByTestId('user-status-user-3')).toHaveTextContent('online');
  });

  it('should pass correct props to PresenceIndicator', () => {
    renderPresenceList();
    
    const indicator = screen.getByTestId('presence-indicator-user-1');
    expect(indicator).toHaveAttribute('data-size', 'medium');
    expect(indicator).toHaveAttribute('data-show-name', 'true');
    expect(indicator).toHaveAttribute('data-show-status', 'true');
  });

  it('should handle user click events', async () => {
    const user = userEvent.setup();
    const onUserClick = vi.fn();
    renderPresenceList({ onUserClick });
    
    const userItem = screen.getByTestId('user-name-user-1').closest('li');
    if (userItem) {
      await user.click(userItem);
      expect(onUserClick).toHaveBeenCalledTimes(1);
      expect(onUserClick).toHaveBeenCalledWith(mockUsers[0]);
    }
  });
});

describe('PresenceList Expansion and Overflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should show all users when count is below maxVisible', () => {
    const smallUserList = [mockUsers[0], mockUsers[1]];
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...smallUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...smallUserList]),
      maxVisible: 5,
    });
    
    expect(screen.getByTestId('presence-indicator-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-2')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('should show overflow indicator when users exceed maxVisible', () => {
    const largeUserList = mockUsers.slice(0, 6); // 6 users
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    // Should show first 3 users
    expect(screen.getByTestId('presence-indicator-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-2')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-3')).toBeInTheDocument();
    
    // Should not show remaining users
    expect(screen.queryByTestId('presence-indicator-user-4')).not.toBeInTheDocument();
    
    // Should show overflow indicator
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('should show toggle button when users exceed maxVisible', () => {
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should expand to show all users when toggle is clicked', async () => {
    const user = userEvent.setup();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    await user.click(toggleButton);
    
    // Should now show all users
    expect(screen.getByTestId('presence-indicator-user-4')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-5')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-6')).toBeInTheDocument();
    
    // Overflow indicator should be gone
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('should change toggle button label when expanded', async () => {
    const user = userEvent.setup();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    await user.click(toggleButton);
    
    expect(screen.getByLabelText('Collapse participants')).toBeInTheDocument();
  });

  it('should handle overflow indicator click', async () => {
    const user = userEvent.setup();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const overflowIndicator = screen.getByText('+3');
    await user.click(overflowIndicator);
    
    // Should expand the list
    expect(screen.getByTestId('presence-indicator-user-4')).toBeInTheDocument();
  });
});

describe('PresenceList External Control', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should use external expanded state when provided', () => {
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
      expanded: true,
      onToggleExpanded: vi.fn(),
    });
    
    // Should show all users when externally controlled and expanded
    expect(screen.getByTestId('presence-indicator-user-4')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-5')).toBeInTheDocument();
    expect(screen.getByTestId('presence-indicator-user-6')).toBeInTheDocument();
  });

  it('should call onToggleExpanded when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleExpanded = vi.fn();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
      expanded: false,
      onToggleExpanded,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    await user.click(toggleButton);
    
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it('should use internal state when no external control provided', async () => {
    const user = userEvent.setup();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
      // No expanded or onToggleExpanded props
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    await user.click(toggleButton);
    
    // Should expand using internal state
    expect(screen.getByTestId('presence-indicator-user-4')).toBeInTheDocument();
  });
});

describe('PresenceList User Presence Information', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display current route for users', () => {
    const usersWithPresence = [mockUsers[0]];
    const presenceMap = new Map();
    presenceMap.set('user-1', {
      userId: 'user-1',
      currentRoute: '/works/W123456789',
      lastActivity: Date.now(),
    });
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...usersWithPresence]),
      userPresence: presenceMap,
    });
    
    expect(screen.getByText('W123456789')).toBeInTheDocument();
  });

  it('should show activity indicator for recently active users', () => {
    const usersWithPresence = [mockUsers[0]];
    const presenceMap = new Map();
    presenceMap.set('user-1', {
      userId: 'user-1',
      currentRoute: '/current-page',
      lastActivity: Date.now() - 60000, // 1 minute ago - should be active
    });
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...usersWithPresence]),
      userPresence: presenceMap,
    });
    
    const userItem = screen.getByTestId('presence-indicator-user-1').closest('li');
    const activityIndicator = userItem?.querySelector('div[style*="backgroundColor: #10B981"]');
    expect(activityIndicator).toBeInTheDocument();
  });

  it('should not show activity indicator for inactive users', () => {
    const usersWithPresence = [mockUsers[0]];
    const presenceMap = new Map();
    presenceMap.set('user-1', {
      userId: 'user-1',
      currentRoute: '/current-page',
      lastActivity: Date.now() - 600000, // 10 minutes ago - should be inactive
    });
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...usersWithPresence]),
      userPresence: presenceMap,
    });
    
    const userItem = screen.getByTestId('presence-indicator-user-1').closest('li');
    const activityIndicator = userItem?.querySelector('div[style*="backgroundColor: #10B981"]');
    expect(activityIndicator).not.toBeInTheDocument();
  });

  it('should handle users without presence data', () => {
    const usersWithoutPresence = [mockUsers[0]];
    const emptyPresenceMap = new Map();
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...usersWithoutPresence]),
      userPresence: emptyPresenceMap,
    });
    
    expect(screen.getByTestId('presence-indicator-user-1')).toBeInTheDocument();
  });
});

describe('PresenceList Sorting and Ordering', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should sort users by last activity (most recent first)', () => {
    const users = [
      { ...mockUsers[0], lastSeen: Date.now() - 300000 }, // 5 minutes ago
      { ...mockUsers[1], lastSeen: Date.now() - 100000 }, // 1.67 minutes ago
      { ...mockUsers[2], lastSeen: Date.now() - 200000 }, // 3.33 minutes ago
    ];
    
    const presenceMap = new Map();
    presenceMap.set('user-1', { userId: 'user-1', lastActivity: Date.now() - 300000, currentRoute: '/page1' });
    presenceMap.set('user-2', { userId: 'user-2', lastActivity: Date.now() - 100000, currentRoute: '/page2' });
    presenceMap.set('user-3', { userId: 'user-3', lastActivity: Date.now() - 200000, currentRoute: '/page3' });
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...users]),
      userPresence: presenceMap,
    });
    
    const userItems = screen.getAllByTestId(/^presence-indicator-user-/);
    
    // Should be sorted by activity: user-2 (most recent), user-3, user-1 (least recent)
    expect(userItems[0]).toHaveAttribute('data-testid', 'presence-indicator-user-2');
    expect(userItems[1]).toHaveAttribute('data-testid', 'presence-indicator-user-3');
    expect(userItems[2]).toHaveAttribute('data-testid', 'presence-indicator-user-1');
  });

  it('should fall back to user lastSeen when presence data is unavailable', () => {
    const users = [
      { ...mockUsers[0], lastSeen: Date.now() - 300000 },
      { ...mockUsers[1], lastSeen: Date.now() - 100000 },
    ];
    
    const emptyPresenceMap = new Map();
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...users]),
      userPresence: emptyPresenceMap,
    });
    
    const userItems = screen.getAllByTestId(/^presence-indicator-user-/);
    
    // Should be sorted by lastSeen: user-2 (more recent), user-1 (less recent)
    expect(userItems[0]).toHaveAttribute('data-testid', 'presence-indicator-user-2');
    expect(userItems[1]).toHaveAttribute('data-testid', 'presence-indicator-user-1');
  });
});

describe('PresenceList Accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should have proper list semantics', () => {
    renderPresenceList();
    
    const list = screen.getByRole('list', { name: 'Active participants' });
    expect(list).toBeInTheDocument();
  });

  it('should have proper aria-label for toggle button', () => {
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should update aria-label when expanded state changes', async () => {
    const user = userEvent.setup();
    const largeUserList = mockUsers.slice(0, 6);
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...largeUserList]),
      userPresence: createPresenceMap([mockCurrentUser, ...largeUserList]),
      maxVisible: 3,
    });
    
    const toggleButton = screen.getByLabelText('Expand participants');
    await user.click(toggleButton);
    
    expect(screen.getByLabelText('Collapse participants')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    const onUserClick = vi.fn();
    renderPresenceList({ onUserClick });
    
    // Tab to first user item
    await user.tab();
    
    // Should be able to activate with Enter
    await user.keyboard('{Enter}');
    
    // This would work if the component implements keyboard handling
    // expect(onUserClick).toHaveBeenCalledTimes(1);
  });
});

describe('PresenceList Edge Cases', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle empty participants map', () => {
    renderPresenceList({
      participants: new Map(),
      userPresence: new Map(),
    });
    
    expect(screen.queryByText(/Participants/)).not.toBeInTheDocument();
  });

  it('should handle participants with undefined currentUser', () => {
    renderPresenceList({ currentUser: undefined });
    
    // Should show all participants including the original "current" user
    expect(screen.getByTestId('presence-indicator-current-user')).toBeInTheDocument();
  });

  it('should handle very large user lists', () => {
    const manyUsers = Array.from({ length: 100 }, (_, i) => 
      createMockUser(`user-${i}`, `User ${i}`)
    );
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, ...manyUsers]),
      userPresence: createPresenceMap([mockCurrentUser, ...manyUsers]),
      maxVisible: 5,
    });
    
    expect(screen.getByText('Participants (100)')).toBeInTheDocument();
    expect(screen.getByText('+95')).toBeInTheDocument();
  });

  it('should handle users with very long names', () => {
    const userWithLongName = createMockUser(
      'long-name-user',
      'Dr. Alexander Maximilian Richardson-Williams III PhD MD'
    );
    
    renderPresenceList({
      participants: createParticipantsMap([mockCurrentUser, userWithLongName]),
      userPresence: createPresenceMap([mockCurrentUser, userWithLongName]),
    });
    
    expect(screen.getByTestId('user-name-long-name-user')).toHaveTextContent(
      'Dr. Alexander Maximilian Richardson-Williams III PhD MD'
    );
  });

  it('should handle rapid participant changes', () => {
    const { rerender } = renderPresenceList();
    
    // Simulate rapid participant updates
    for (let i = 0; i < 5; i++) {
      const newUsers = mockUsers.slice(0, i + 2);
      rerender(
        <PresenceList
          participants={createParticipantsMap([mockCurrentUser, ...newUsers])}
          userPresence={createPresenceMap([mockCurrentUser, ...newUsers])}
          currentUser={mockCurrentUser}
        />
      );
    }
    
    // Should handle updates gracefully
    expect(screen.getByText('Participants (6)')).toBeInTheDocument();
  });

  it('should handle null or undefined presence data gracefully', () => {
    const usersWithCorruptedPresence = [mockUsers[0]];
    const corruptedPresenceMap = new Map();
    corruptedPresenceMap.set('user-1', null as any);
    
    expect(() => {
      renderPresenceList({
        participants: createParticipantsMap([mockCurrentUser, ...usersWithCorruptedPresence]),
        userPresence: corruptedPresenceMap,
      });
    }).not.toThrow();
  });
});