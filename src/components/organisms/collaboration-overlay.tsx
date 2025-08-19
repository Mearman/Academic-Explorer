/**
 * Collaboration overlay component
 * Main component that orchestrates all collaboration features
 */

import { AnimatePresence } from 'framer-motion';
import { memo, useEffect, useCallback, useRef } from 'react';

import { UserCursor } from '@/components/atoms/user-cursor';
import { UserSelection } from '@/components/atoms/user-selection';
import { PresenceList } from '@/components/organisms/presence-list';
import { useCollaborationStore } from '@/stores/collaboration-store';
import type { UserPresence } from '@/types/collaboration';

export interface CollaborationOverlayProps {
  /** Whether to show user cursors */
  showCursors?: boolean;
  /** Whether to show user selections */
  showSelections?: boolean;
  /** Whether to show the presence list */
  showPresenceList?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Hook for tracking mouse movement and selection
 */
function usePresenceTracking() {
  const { currentUser, currentSession, updateUserPresence } = useCollaborationStore();
  const lastUpdateTime = useRef(0);
  const updateThrottle = 100; // Throttle updates to 10fps

  // Throttled presence update function
  const throttledUpdate = useCallback((presence: Partial<UserPresence>) => {
    const now = Date.now();
    if (now - lastUpdateTime.current < updateThrottle) {
      return;
    }
    lastUpdateTime.current = now;
    updateUserPresence(presence);
  }, [updateUserPresence]);

  // Mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!currentUser || !currentSession) return;

    throttledUpdate({
      cursor: {
        x: event.clientX,
        y: event.clientY,
        visible: true,
      },
      currentRoute: window.location.pathname,
    });
  }, [currentUser, currentSession, throttledUpdate]);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    if (!currentUser || !currentSession) return;

    updateUserPresence({
      cursor: {
        x: 0,
        y: 0,
        visible: false,
      },
    });
  }, [currentUser, currentSession, updateUserPresence]);

  // Selection handler
  const handleSelectionChange = useCallback(() => {
    if (!currentUser || !currentSession) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // Clear selection
      updateUserPresence({
        selection: undefined,
      });
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const content = selection.toString();

      if (content.trim()) {
        updateUserPresence({
          selection: {
            start: { x: rect.left, y: rect.top },
            end: { x: rect.right, y: rect.bottom },
            content: content,
            type: 'text',
          },
        });
      }
    } catch (error) {
      console.warn('Failed to handle selection change:', error);
    }
  }, [currentUser, currentSession, updateUserPresence]);

  // Route change handler
  useEffect(() => {
    if (!currentUser || !currentSession) return;

    updateUserPresence({
      currentRoute: window.location.pathname,
    });
  }, [currentUser, currentSession, updateUserPresence]);

  // Set up event listeners
  useEffect(() => {
    if (!currentUser || !currentSession) return;

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleMouseMove, handleMouseLeave, handleSelectionChange]);
}

/**
 * Collaboration overlay component
 */
export const CollaborationOverlay = memo<CollaborationOverlayProps>(({
  showCursors = true,
  showSelections = true,
  showPresenceList = true,
  className = '',
}) => {
  const {
    currentSession,
    currentUser,
    userPresence,
    connectionStatus,
  } = useCollaborationStore();

  // Track current user's presence
  usePresenceTracking();

  // Don't render anything if no active session
  if (!currentSession || !currentUser || connectionStatus !== 'connected') {
    return null;
  }

  // Get other users (exclude current user)
  const otherUsers = Array.from(currentSession.participants.values()).filter(
    user => user.id !== currentUser.id
  );

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
      role="region"
      aria-label="Collaboration overlay"
    >
      {/* User cursors */}
      {showCursors && (
        <AnimatePresence>
          {otherUsers.map(user => {
            const presence = userPresence.get(user.id);
            if (!presence?.cursor?.visible) return null;

            return (
              <UserCursor
                key={`cursor-${user.id}`}
                user={user}
                cursor={presence.cursor}
                showLabel={true}
              />
            );
          })}
        </AnimatePresence>
      )}

      {/* User selections */}
      {showSelections && (
        <AnimatePresence>
          {otherUsers.map(user => {
            const presence = userPresence.get(user.id);
            if (!presence?.selection) return null;

            return (
              <UserSelection
                key={`selection-${user.id}`}
                user={user}
                selection={presence.selection}
              />
            );
          })}
        </AnimatePresence>
      )}

      {/* Presence list */}
      {showPresenceList && otherUsers.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            pointerEvents: 'auto',
            zIndex: 1001,
          }}
        >
          <PresenceList
            participants={currentSession.participants}
            userPresence={userPresence}
            currentUser={currentUser}
            maxVisible={5}
            onUserClick={(user) => {
              console.log('User clicked:', user);
              // Could implement focus on user's location, etc.
            }}
          />
        </div>
      )}

      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: connectionStatus === 'connecting' ? '#F59E0B' : '#EF4444',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {connectionStatus === 'connecting' && 'Connecting to collaboration...'}
          {connectionStatus === 'disconnected' && 'Disconnected from collaboration'}
          {connectionStatus === 'error' && 'Connection error'}
        </div>
      )}
    </div>
  );
});

CollaborationOverlay.displayName = 'CollaborationOverlay';