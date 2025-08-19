/**
 * Hook for managing session sharing and URL-based access
 * Handles session invitations, URL generation, and permission management
 */

import { useState, useCallback, useEffect } from 'react';

import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  CollaborationSession, 
  PermissionLevel, 
  UserPermissions,
  CollaborationUser 
} from '@/types/collaboration';
import { PERMISSION_LEVELS } from '@/types/collaboration';

export interface ShareableLink {
  /** Unique shareable token */
  token: string;
  /** Share URL */
  url: string;
  /** Permission level for the link */
  permissions: PermissionLevel;
  /** Expiry timestamp */
  expiresAt: number;
  /** Whether the link allows anonymous access */
  allowAnonymous: boolean;
  /** Maximum number of uses */
  maxUses?: number;
  /** Current number of uses */
  currentUses: number;
}

export interface SessionInvitation {
  /** Invitation ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Inviter user */
  inviter: Pick<CollaborationUser, 'id' | 'name' | 'avatar'>;
  /** Invited user email */
  inviteeEmail: string;
  /** Permission level */
  permissions: PermissionLevel;
  /** Creation timestamp */
  createdAt: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Invitation status */
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  /** Optional message */
  message?: string;
}

export interface UseSessionSharingReturn {
  /** Current session shareable links */
  shareableLinks: ShareableLink[];
  /** Pending invitations */
  invitations: SessionInvitation[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  
  // Actions
  /** Create a new shareable link */
  createShareableLink: (options: {
    permissions: PermissionLevel;
    expiresIn?: number; // milliseconds
    allowAnonymous?: boolean;
    maxUses?: number;
  }) => Promise<ShareableLink>;
  
  /** Revoke a shareable link */
  revokeShareableLink: (token: string) => Promise<void>;
  
  /** Send email invitation */
  sendInvitation: (options: {
    email: string;
    permissions: PermissionLevel;
    message?: string;
    expiresIn?: number;
  }) => Promise<SessionInvitation>;
  
  /** Join session via share token */
  joinViaToken: (token: string, userInfo?: Partial<CollaborationUser>) => Promise<void>;
  
  /** Accept invitation */
  acceptInvitation: (invitationId: string, userInfo: Partial<CollaborationUser>) => Promise<void>;
  
  /** Decline invitation */
  declineInvitation: (invitationId: string) => Promise<void>;
  
  /** Get session info from token */
  getSessionInfoFromToken: (token: string) => Promise<{
    session: Pick<CollaborationSession, 'id' | 'title' | 'description' | 'visibility'>;
    permissions: UserPermissions;
    isValid: boolean;
    expiresAt: number;
  }>;
  
  /** Update link permissions */
  updateLinkPermissions: (token: string, permissions: PermissionLevel) => Promise<void>;
  
  /** Get invitation by ID */
  getInvitation: (invitationId: string) => Promise<SessionInvitation | null>;
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Safely get permissions for a permission level
 */
function getPermissionsForLevel(level: PermissionLevel): UserPermissions {
  const permissions = PERMISSION_LEVELS[level];
  if (!permissions) {
    throw new Error(`Invalid permission level: ${level}`);
  }
  return permissions;
}

/**
 * Build share URL from token
 */
function buildShareUrl(token: string): string {
  const baseUrl = window.location.origin;
  const basePath = window.location.pathname.split('/').slice(0, -1).join('/');
  return `${baseUrl}${basePath}/join/${token}`;
}

/**
 * Session sharing hook
 */
export function useSessionSharing(): UseSessionSharingReturn {
  const { currentSession, currentUser, joinSession } = useCollaborationStore();
  
  const [shareableLinks, setShareableLinks] = useState<ShareableLink[]>([]);
  const [invitations, setInvitations] = useState<SessionInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing links and invitations for current session
  useEffect(() => {
    if (currentSession) {
      loadSessionSharingData(currentSession.id);
    }
  }, [currentSession]);

  /**
   * Load sharing data for a session
   */
  const loadSessionSharingData = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would fetch from API
      // For now, we'll use localStorage as a mock backend
      const linksKey = `session-links-${sessionId}`;
      const invitationsKey = `session-invitations-${sessionId}`;
      
      const storedLinks = localStorage.getItem(linksKey);
      const storedInvitations = localStorage.getItem(invitationsKey);
      
      if (storedLinks) {
        const links = JSON.parse(storedLinks) as ShareableLink[];
        // Filter out expired links
        const validLinks = links.filter(link => link.expiresAt > Date.now());
        setShareableLinks(validLinks);
        
        // Save back filtered links
        localStorage.setItem(linksKey, JSON.stringify(validLinks));
      }
      
      if (storedInvitations) {
        const invites = JSON.parse(storedInvitations) as SessionInvitation[];
        // Update expired invitations
        const updatedInvites = invites.map(invite => ({
          ...invite,
          status: invite.expiresAt < Date.now() && invite.status === 'pending' 
            ? 'expired' as const 
            : invite.status
        }));
        setInvitations(updatedInvites);
        
        // Save back updated invitations
        localStorage.setItem(invitationsKey, JSON.stringify(updatedInvites));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sharing data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new shareable link
   */
  const createShareableLink = useCallback(async (options: {
    permissions: PermissionLevel;
    expiresIn?: number;
    allowAnonymous?: boolean;
    maxUses?: number;
  }): Promise<ShareableLink> => {
    if (!currentSession || !currentUser) {
      throw new Error('No active session or user');
    }

    if (!currentUser.permissions.canInvite) {
      throw new Error('Insufficient permissions to create shareable links');
    }

    try {
      setError(null);
      
      const token = generateToken();
      const expiresAt = Date.now() + (options.expiresIn || 7 * 24 * 60 * 60 * 1000); // 7 days default
      
      const link: ShareableLink = {
        token,
        url: buildShareUrl(token),
        permissions: options.permissions,
        expiresAt,
        allowAnonymous: options.allowAnonymous ?? true,
        maxUses: options.maxUses,
        currentUses: 0,
      };

      // Store link
      const linksKey = `session-links-${currentSession.id}`;
      const existingLinks = localStorage.getItem(linksKey);
      const links = existingLinks ? JSON.parse(existingLinks) : [];
      links.push(link);
      localStorage.setItem(linksKey, JSON.stringify(links));
      
      // Store token mapping
      const tokenKey = `share-token-${token}`;
      localStorage.setItem(tokenKey, JSON.stringify({
        sessionId: currentSession.id,
        link,
      }));

      setShareableLinks(prev => [...prev, link]);
      
      return link;
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create shareable link';
      setError(error);
      throw new Error(error);
    }
  }, [currentSession, currentUser]);

  /**
   * Revoke a shareable link
   */
  const revokeShareableLink = useCallback(async (token: string): Promise<void> => {
    if (!currentSession || !currentUser) {
      throw new Error('No active session or user');
    }

    if (!currentUser.permissions.canInvite) {
      throw new Error('Insufficient permissions to revoke shareable links');
    }

    try {
      setError(null);
      
      // Remove from session links
      const linksKey = `session-links-${currentSession.id}`;
      const existingLinks = localStorage.getItem(linksKey);
      if (existingLinks) {
        const links = JSON.parse(existingLinks) as ShareableLink[];
        const filteredLinks = links.filter(link => link.token !== token);
        localStorage.setItem(linksKey, JSON.stringify(filteredLinks));
        setShareableLinks(filteredLinks);
      }
      
      // Remove token mapping
      const tokenKey = `share-token-${token}`;
      localStorage.removeItem(tokenKey);
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to revoke shareable link';
      setError(error);
      throw new Error(error);
    }
  }, [currentSession, currentUser]);

  /**
   * Send email invitation
   */
  const sendInvitation = useCallback(async (options: {
    email: string;
    permissions: PermissionLevel;
    message?: string;
    expiresIn?: number;
  }): Promise<SessionInvitation> => {
    if (!currentSession || !currentUser) {
      throw new Error('No active session or user');
    }

    if (!currentUser.permissions.canInvite) {
      throw new Error('Insufficient permissions to send invitations');
    }

    try {
      setError(null);
      
      const invitationId = generateId();
      const expiresAt = Date.now() + (options.expiresIn || 7 * 24 * 60 * 60 * 1000); // 7 days default
      
      const invitation: SessionInvitation = {
        id: invitationId,
        sessionId: currentSession.id,
        inviter: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        inviteeEmail: options.email,
        permissions: options.permissions,
        createdAt: Date.now(),
        expiresAt,
        status: 'pending',
        message: options.message,
      };

      // Store invitation
      const invitationsKey = `session-invitations-${currentSession.id}`;
      const existingInvitations = localStorage.getItem(invitationsKey);
      const invitations = existingInvitations ? JSON.parse(existingInvitations) : [];
      invitations.push(invitation);
      localStorage.setItem(invitationsKey, JSON.stringify(invitations));
      
      // Store invitation mapping
      const invitationKey = `invitation-${invitationId}`;
      localStorage.setItem(invitationKey, JSON.stringify(invitation));

      setInvitations(prev => [...prev, invitation]);

      // In a real implementation, this would send an actual email
      console.log('Email invitation sent:', invitation);
      
      return invitation;
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(error);
      throw new Error(error);
    }
  }, [currentSession, currentUser]);

  /**
   * Join session via share token
   */
  const joinViaToken = useCallback(async (
    token: string, 
    userInfo?: Partial<CollaborationUser>
  ): Promise<void> => {
    try {
      setError(null);
      
      // Get token data
      const tokenKey = `share-token-${token}`;
      const tokenData = localStorage.getItem(tokenKey);
      
      if (!tokenData) {
        throw new Error('Invalid or expired share link');
      }
      
      const { sessionId, link } = JSON.parse(tokenData);
      
      // Check if link is still valid
      if (link.expiresAt < Date.now()) {
        throw new Error('Share link has expired');
      }
      
      // Check usage limits
      if (link.maxUses && link.currentUses >= link.maxUses) {
        throw new Error('Share link usage limit exceeded');
      }
      
      // Get user permissions for the link
      const permissions = getPermissionsForLevel(link.permissions);
      
      // Join the session
      await joinSession(sessionId, {
        ...userInfo,
        permissions,
      });
      
      // Increment usage count
      link.currentUses++;
      localStorage.setItem(tokenKey, JSON.stringify({ sessionId, link }));
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join session';
      setError(error);
      throw new Error(error);
    }
  }, [joinSession]);

  /**
   * Accept invitation
   */
  const acceptInvitation = useCallback(async (
    invitationId: string,
    userInfo: Partial<CollaborationUser>
  ): Promise<void> => {
    try {
      setError(null);
      
      // Get invitation data
      const invitationKey = `invitation-${invitationId}`;
      const invitationData = localStorage.getItem(invitationKey);
      
      if (!invitationData) {
        throw new Error('Invitation not found');
      }
      
      const invitation = JSON.parse(invitationData) as SessionInvitation;
      
      // Check if invitation is still valid
      if (invitation.expiresAt < Date.now()) {
        throw new Error('Invitation has expired');
      }
      
      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }
      
      // Get user permissions for the invitation
      const permissions = getPermissionsForLevel(invitation.permissions);
      
      // Join the session
      await joinSession(invitation.sessionId, {
        ...userInfo,
        permissions,
      });
      
      // Update invitation status
      invitation.status = 'accepted';
      localStorage.setItem(invitationKey, JSON.stringify(invitation));
      
      // Update invitations list
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? { ...inv, status: 'accepted' } : inv
      ));
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(error);
      throw new Error(error);
    }
  }, [joinSession]);

  /**
   * Decline invitation
   */
  const declineInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      setError(null);
      
      // Get invitation data
      const invitationKey = `invitation-${invitationId}`;
      const invitationData = localStorage.getItem(invitationKey);
      
      if (!invitationData) {
        throw new Error('Invitation not found');
      }
      
      const invitation = JSON.parse(invitationData) as SessionInvitation;
      
      // Update invitation status
      invitation.status = 'declined';
      localStorage.setItem(invitationKey, JSON.stringify(invitation));
      
      // Update invitations list
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? { ...inv, status: 'declined' } : inv
      ));
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to decline invitation';
      setError(error);
      throw new Error(error);
    }
  }, []);

  /**
   * Get session info from token
   */
  const getSessionInfoFromToken = useCallback(async (token: string) => {
    try {
      const tokenKey = `share-token-${token}`;
      const tokenData = localStorage.getItem(tokenKey);
      
      if (!tokenData) {
        throw new Error('Invalid share token');
      }
      
      const { sessionId, link } = JSON.parse(tokenData);
      
      // Get session data (in real implementation, this would be an API call)
      const sessionKey = `session-${sessionId}`;
      const sessionData = localStorage.getItem(sessionKey);
      
      if (!sessionData) {
        throw new Error('Session not found');
      }
      
      const session = JSON.parse(sessionData) as CollaborationSession;
      const permissions = getPermissionsForLevel(link.permissions);
      const isValid = link.expiresAt > Date.now() && 
                     (!link.maxUses || link.currentUses < link.maxUses);
      
      return {
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          visibility: session.visibility,
        },
        permissions,
        isValid,
        expiresAt: link.expiresAt,
      };
      
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get session info');
    }
  }, []);

  /**
   * Update link permissions
   */
  const updateLinkPermissions = useCallback(async (
    token: string, 
    permissions: PermissionLevel
  ): Promise<void> => {
    if (!currentSession || !currentUser) {
      throw new Error('No active session or user');
    }

    if (!currentUser.permissions.canAdmin) {
      throw new Error('Insufficient permissions to update link permissions');
    }

    try {
      setError(null);
      
      // Update token data
      const tokenKey = `share-token-${token}`;
      const tokenData = localStorage.getItem(tokenKey);
      
      if (!tokenData) {
        throw new Error('Share link not found');
      }
      
      const { sessionId, link } = JSON.parse(tokenData);
      link.permissions = permissions;
      localStorage.setItem(tokenKey, JSON.stringify({ sessionId, link }));
      
      // Update session links
      const linksKey = `session-links-${currentSession.id}`;
      const existingLinks = localStorage.getItem(linksKey);
      if (existingLinks) {
        const links = JSON.parse(existingLinks) as ShareableLink[];
        const updatedLinks = links.map(l => 
          l.token === token ? { ...l, permissions } : l
        );
        localStorage.setItem(linksKey, JSON.stringify(updatedLinks));
        setShareableLinks(updatedLinks);
      }
      
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update link permissions';
      setError(error);
      throw new Error(error);
    }
  }, [currentSession, currentUser]);

  /**
   * Get invitation by ID
   */
  const getInvitation = useCallback(async (invitationId: string): Promise<SessionInvitation | null> => {
    try {
      const invitationKey = `invitation-${invitationId}`;
      const invitationData = localStorage.getItem(invitationKey);
      
      if (!invitationData) {
        return null;
      }
      
      return JSON.parse(invitationData) as SessionInvitation;
      
    } catch (err) {
      console.error('Failed to get invitation:', err);
      return null;
    }
  }, []);

  return {
    shareableLinks,
    invitations,
    isLoading,
    error,
    createShareableLink,
    revokeShareableLink,
    sendInvitation,
    joinViaToken,
    acceptInvitation,
    declineInvitation,
    getSessionInfoFromToken,
    updateLinkPermissions,
    getInvitation,
  };
}