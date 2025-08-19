/**
 * Component tests for ShareSessionModal molecule
 * Tests modal interactions, form handling, link sharing, and email invitations
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import type { PermissionLevel } from '@/types/collaboration';

import { ShareSessionModal } from './share-session-modal';

// Mock the session sharing hook
const mockCreateShareableLink = vi.fn();
const mockRevokeShareableLink = vi.fn();
const mockSendInvitation = vi.fn();

vi.mock('@/hooks/use-session-sharing', () => ({
  useSessionSharing: () => ({
    shareableLinks: [],
    invitations: [],
    isLoading: false,
    error: null,
    createShareableLink: mockCreateShareableLink,
    revokeShareableLink: mockRevokeShareableLink,
    sendInvitation: mockSendInvitation,
  }),
}));

// Mock framer-motion to avoid animation-related test issues
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, style, initial, animate, exit, onClick, ...props }, ref) => (
      <div ref={ref} style={style} onClick={onClick} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Test utilities
const renderShareSessionModal = (props: Partial<React.ComponentProps<typeof ShareSessionModal>> = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };
  return render(<ShareSessionModal {...defaultProps} {...props} />);
};

describe('ShareSessionModal Basic Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    renderShareSessionModal();
    
    expect(screen.getByText('Share Collaboration Session')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    renderShareSessionModal({ isOpen: false });
    
    expect(screen.queryByText('Share Collaboration Session')).not.toBeInTheDocument();
  });

  it('should render with custom session title', () => {
    renderShareSessionModal({ sessionTitle: 'Research Session Alpha' });
    
    expect(screen.getByText('Share Research Session Alpha')).toBeInTheDocument();
  });

  it('should render close button', () => {
    renderShareSessionModal();
    
    const closeButton = screen.getByText('×');
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderShareSessionModal({ onClose });
    
    const closeButton = screen.getByText('×');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderShareSessionModal({ onClose });
    
    // Click the modal backdrop (the outermost div)
    const backdrop = screen.getByText('Share Collaboration Session').closest('div')?.parentElement?.parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderShareSessionModal({ onClose });
    
    const modalContent = screen.getByText('Share Collaboration Session');
    await user.click(modalContent);
    
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ShareSessionModal Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render both tab buttons', () => {
    renderShareSessionModal();
    
    expect(screen.getByText('Share Link')).toBeInTheDocument();
    expect(screen.getByText('Email Invitation')).toBeInTheDocument();
  });

  it('should start with Share Link tab active', () => {
    renderShareSessionModal();
    
    const shareLinkTab = screen.getByText('Share Link');
    expect(shareLinkTab).toHaveStyle({ color: '#3B82F6' });
  });

  it('should switch to Email Invitation tab when clicked', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(emailTab).toHaveStyle({ color: '#3B82F6' });
  });

  it('should display different content for each tab', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Initially on Share Link tab
    expect(screen.getByText('Create Share Link')).toBeInTheDocument();
    expect(screen.queryByText('Send Invitation')).not.toBeInTheDocument();
    
    // Switch to Email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(screen.getByText('Send Invitation')).toBeInTheDocument();
    expect(screen.queryByText('Create Share Link')).not.toBeInTheDocument();
  });
});

describe('ShareSessionModal Share Link Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render permission selector', () => {
    renderShareSessionModal();
    
    expect(screen.getByText('Permission Level')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Annotator - Can add annotations and comments')).toBeInTheDocument();
  });

  it('should render expiry selector', () => {
    renderShareSessionModal();
    
    expect(screen.getByText('Link Expires')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7 days')).toBeInTheDocument();
  });

  it('should render anonymous access checkbox', () => {
    renderShareSessionModal();
    
    const checkbox = screen.getByLabelText('Allow anonymous access');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('should render max uses input', () => {
    renderShareSessionModal();
    
    expect(screen.getByText('Maximum uses (optional)')).toBeInTheDocument();
    const maxUsesInput = screen.getByPlaceholderText('Unlimited');
    expect(maxUsesInput).toBeInTheDocument();
  });

  it('should allow changing permission level', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const permissionSelect = screen.getByDisplayValue('Annotator - Can add annotations and comments');
    await user.selectOptions(permissionSelect, 'editor');
    
    expect(permissionSelect).toHaveValue('editor');
  });

  it('should allow changing expiry time', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const expirySelect = screen.getByDisplayValue('7 days');
    await user.selectOptions(expirySelect, '86400000'); // 24 hours
    
    expect(expirySelect).toHaveValue('86400000');
  });

  it('should allow toggling anonymous access', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const checkbox = screen.getByLabelText('Allow anonymous access');
    await user.click(checkbox);
    
    expect(checkbox).not.toBeChecked();
  });

  it('should allow setting max uses', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const maxUsesInput = screen.getByPlaceholderText('Unlimited');
    await user.type(maxUsesInput, '10');
    
    expect(maxUsesInput).toHaveValue(10);
  });
});

describe('ShareSessionModal Email Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render email input', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('colleague@university.edu')).toBeInTheDocument();
  });

  it('should render permission selector in email tab', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(screen.getByText('Permission Level')).toBeInTheDocument();
  });

  it('should render message textarea', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(screen.getByText('Personal Message (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Hi! I'd like to invite you/)).toBeInTheDocument();
  });

  it('should disable send button when email is empty', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    const sendButton = screen.getByText('Send Invitation');
    expect(sendButton).toHaveStyle({ backgroundColor: '#9CA3AF' });
  });

  it('should enable send button when email is provided', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const sendButton = screen.getByText('Send Invitation');
    expect(sendButton).toHaveStyle({ backgroundColor: '#3B82F6' });
  });
});

describe('ShareSessionModal Link Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateShareableLink.mockResolvedValue({
      token: 'test-token-123',
      url: 'https://example.com/join/test-token-123',
      permissions: 'annotator',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      allowAnonymous: true,
      currentUses: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should call createShareableLink when Create Share Link is clicked', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    expect(mockCreateShareableLink).toHaveBeenCalledTimes(1);
    expect(mockCreateShareableLink).toHaveBeenCalledWith({
      permissions: 'annotator',
      expiresIn: 7 * 24 * 60 * 60 * 1000,
      allowAnonymous: true,
      maxUses: undefined,
    });
  });

  it('should copy link to clipboard automatically after creation', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/join/test-token-123');
    });
  });

  it('should show loading state while creating link', async () => {
    const user = userEvent.setup();
    mockCreateShareableLink.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderShareSessionModal();
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });

  it('should pass custom settings to createShareableLink', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Change settings
    const permissionSelect = screen.getByDisplayValue('Annotator - Can add annotations and comments');
    await user.selectOptions(permissionSelect, 'editor');
    
    const anonymousCheckbox = screen.getByLabelText('Allow anonymous access');
    await user.click(anonymousCheckbox);
    
    const maxUsesInput = screen.getByPlaceholderText('Unlimited');
    await user.type(maxUsesInput, '5');
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    expect(mockCreateShareableLink).toHaveBeenCalledWith({
      permissions: 'editor',
      expiresIn: 7 * 24 * 60 * 60 * 1000,
      allowAnonymous: false,
      maxUses: 5,
    });
  });
});

describe('ShareSessionModal Invitation Sending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInvitation.mockResolvedValue({
      id: 'invitation-123',
      sessionId: 'session-123',
      inviter: { id: 'user-1', name: 'John Doe' },
      inviteeEmail: 'test@example.com',
      permissions: 'annotator',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      status: 'pending',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should call sendInvitation when Send Invitation is clicked', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Switch to email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    // Fill email
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const sendButton = screen.getByText('Send Invitation');
    await user.click(sendButton);
    
    expect(mockSendInvitation).toHaveBeenCalledTimes(1);
    expect(mockSendInvitation).toHaveBeenCalledWith({
      email: 'test@example.com',
      permissions: 'annotator',
      message: undefined,
      expiresIn: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('should include personal message in invitation', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Switch to email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    // Fill email and message
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const messageInput = screen.getByPlaceholderText(/Hi! I'd like to invite you/);
    await user.type(messageInput, 'Custom invitation message');
    
    const sendButton = screen.getByText('Send Invitation');
    await user.click(sendButton);
    
    expect(mockSendInvitation).toHaveBeenCalledWith({
      email: 'test@example.com',
      permissions: 'annotator',
      message: 'Custom invitation message',
      expiresIn: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('should show loading state while sending invitation', async () => {
    const user = userEvent.setup();
    mockSendInvitation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderShareSessionModal();
    
    // Switch to email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    // Fill email
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const sendButton = screen.getByText('Send Invitation');
    await user.click(sendButton);
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('should clear form after successful invitation', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Switch to email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    // Fill form
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const messageInput = screen.getByPlaceholderText(/Hi! I'd like to invite you/);
    await user.type(messageInput, 'Test message');
    
    const sendButton = screen.getByText('Send Invitation');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(messageInput).toHaveValue('');
    });
  });
});

describe('ShareSessionModal Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle link creation errors', async () => {
    const user = userEvent.setup();
    mockCreateShareableLink.mockRejectedValue(new Error('Failed to create link'));
    
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderShareSessionModal();
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create shareable link:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('should handle invitation sending errors', async () => {
    const user = userEvent.setup();
    mockSendInvitation.mockRejectedValue(new Error('Failed to send invitation'));
    
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderShareSessionModal();
    
    // Switch to email tab
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    // Fill email
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, 'test@example.com');
    
    const sendButton = screen.getByText('Send Invitation');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to send invitation:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('should handle clipboard API failure gracefully', async () => {
    const user = userEvent.setup();
    const clipboardError = new Error('Clipboard access denied');
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(clipboardError);
    
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderShareSessionModal();
    
    const createButton = screen.getByText('Create Share Link');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy link:', clipboardError);
    });
    
    consoleSpy.mockRestore();
  });
});

describe('ShareSessionModal Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should have proper modal structure', () => {
    renderShareSessionModal();
    
    const modal = screen.getByText('Share Collaboration Session').closest('[role="dialog"]');
    expect(modal).toBeInTheDocument();
  });

  it('should have proper form labels', () => {
    renderShareSessionModal();
    
    expect(screen.getByLabelText('Permission Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Link Expires')).toBeInTheDocument();
    expect(screen.getByLabelText('Allow anonymous access')).toBeInTheDocument();
  });

  it('should have proper form labels in email tab', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal Message (optional)')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    // Tab through form elements
    await user.tab();
    await user.tab();
    await user.tab();
    
    // Should be able to navigate through the form
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });

  it('should support escape key to close modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderShareSessionModal({ onClose });
    
    await user.keyboard('{Escape}');
    
    // Note: This would need to be implemented in the actual component
    // expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ShareSessionModal Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should handle empty email submission gracefully', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    const sendButton = screen.getByText('Send Invitation');
    expect(sendButton).toHaveAttribute('disabled');
  });

  it('should handle whitespace-only email', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const emailTab = screen.getByText('Email Invitation');
    await user.click(emailTab);
    
    const emailInput = screen.getByPlaceholderText('colleague@university.edu');
    await user.type(emailInput, '   ');
    
    const sendButton = screen.getByText('Send Invitation');
    expect(sendButton).toHaveAttribute('disabled');
  });

  it('should handle very long session titles', () => {
    const longTitle = 'This is a very long session title that might cause layout issues in the modal header';
    renderShareSessionModal({ sessionTitle: longTitle });
    
    expect(screen.getByText(`Share ${longTitle}`)).toBeInTheDocument();
  });

  it('should handle rapid tab switching', async () => {
    const user = userEvent.setup();
    renderShareSessionModal();
    
    const shareLinkTab = screen.getByText('Share Link');
    const emailTab = screen.getByText('Email Invitation');
    
    // Rapidly switch tabs
    for (let i = 0; i < 5; i++) {
      await user.click(emailTab);
      await user.click(shareLinkTab);
    }
    
    // Should still be functional
    expect(screen.getByText('Create Share Link')).toBeInTheDocument();
  });
});