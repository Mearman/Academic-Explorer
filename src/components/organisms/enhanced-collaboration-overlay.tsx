/**
 * Enhanced collaboration overlay with improved user interaction feedback
 * Provides comprehensive real-time collaboration features with rich visual feedback
 */

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useEffect, useCallback, useRef, useState, useMemo } from 'react';
// import { Notifications } from '@mantine/notifications'; // Package not installed

import { UserCursor } from '@/components/atoms/user-cursor';
import { UserSelection } from '@/components/atoms/user-selection';
import { EnhancedPresenceIndicator } from '@/components/molecules/enhanced-presence-indicator';
import { useEnhancedCollaborationStore } from '@/stores/enhanced-collaboration-store';
import type { UserPresence, CollaborationUser } from '@/types/collaboration';

export interface EnhancedCollaborationOverlayProps {
  /** Whether to show user cursors */
  showCursors?: boolean;
  /** Whether to show user selections */
  showSelections?: boolean;
  /** Whether to show the enhanced presence list */
  showPresenceList?: boolean;
  /** Whether to show connection status */
  showConnectionStatus?: boolean;
  /** Whether to show performance metrics */
  showPerformanceMetrics?: boolean;
  /** Whether to enable collaboration notifications */
  enableNotifications?: boolean;
  /** Position for presence list */
  presenceListPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Custom CSS class */
  className?: string;
}

/**
 * Connection status indicator component
 */
const ConnectionStatusIndicator = memo(({
  connectionStatus,
  connectionQuality,
  networkMetrics,
  onRetry,
}: {
  connectionStatus: string;
  connectionQuality: string;
  networkMetrics: any;
  onRetry: () => void;
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        switch (connectionQuality) {
          case 'excellent': return '#10B981';
          case 'good': return '#059669';
          case 'poor': return '#F59E0B';
          default: return '#EF4444';
        }
      case 'connecting': return '#3B82F6';
      case 'disconnected': return '#EF4444';
      case 'error': return '#DC2626';
      default: return '#9CA3AF';
    }
  };

  const getStatusText = () => {
    if (connectionStatus === 'connected') {
      return `Connected (${connectionQuality})`;
    }
    return connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1);
  };

  const showRetryButton = connectionStatus === 'disconnected' || connectionStatus === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: `2px solid ${getStatusColor()}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1001,
        minWidth: '200px',
      }}
    >
      {/* Status indicator */}
      <motion.div
        animate={{
          backgroundColor: getStatusColor(),
          scale: connectionStatus === 'connecting' ? [1, 1.2, 1] : 1,
        }}
        transition={{
          scale: { duration: 1, repeat: connectionStatus === 'connecting' ? Infinity : 0 },
        }}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
        }}
      />

      {/* Status text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          {getStatusText()}
        </div>
        
        {connectionStatus === 'connected' && networkMetrics && (
          <div
            style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '2px',
            }}
          >
            {networkMetrics.averageLatency > 0 && (
              <span>
                {Math.round(networkMetrics.averageLatency)}ms latency
              </span>
            )}
          </div>
        )}
      </div>

      {/* Retry button */}
      {showRetryButton && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3B82F6',
            color: 'white',
            borderRadius: '4px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Retry
        </motion.button>
      )}
    </motion.div>
  );
});

ConnectionStatusIndicator.displayName = 'ConnectionStatusIndicator';

/**
 * Performance metrics panel component
 */
const PerformanceMetricsPanel = memo(({
  metrics,
  onClose,
}: {
  metrics: any;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 300 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 300 }}
    style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #E5E7EB',
      minWidth: '250px',
      zIndex: 1001,
    }}
  >
    {/* Header */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
        }}
      >
        Performance Metrics
      </h3>
      
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          color: '#6B7280',
        }}
      >
        ×
      </button>
    </div>

    {/* Metrics */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Messages/sec:</span>
        <span style={{ fontSize: '12px', fontWeight: '500' }}>
          {metrics.messagesPerSecond?.toFixed(1) || '0'}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Avg Latency:</span>
        <span style={{ fontSize: '12px', fontWeight: '500' }}>
          {Math.round(metrics.averageLatency || 0)}ms
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Error Rate:</span>
        <span style={{ fontSize: '12px', fontWeight: '500' }}>
          {((metrics.errorRate || 0) * 100).toFixed(1)}%
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Runtime:</span>
        <span style={{ fontSize: '12px', fontWeight: '500' }}>
          {Math.round((metrics.runtime || 0) / 1000)}s
        </span>
      </div>
    </div>
  </motion.div>
));

PerformanceMetricsPanel.displayName = 'PerformanceMetricsPanel';

/**
 * Enhanced presence list component
 */
const EnhancedPresenceList = memo(({
  participants,
  userPresence,
  userActivityStatus,
  participantStability,
  connectionQuality,
  currentUser,
  position,
  onUserClick,
}: {
  participants: Map<string, CollaborationUser>;
  userPresence: Map<string, UserPresence>;
  userActivityStatus: Map<string, string>;
  participantStability: Map<string, number>;
  connectionQuality: string;
  currentUser: CollaborationUser | null;
  position: string;
  onUserClick?: (user: CollaborationUser) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 5;

  // Filter out current user and sort by activity
  const otherUsers = useMemo(() => {
    const users = Array.from(participants.values()).filter(user => 
      user.id !== currentUser?.id
    );
    
    return users.sort((a, b) => {
      const aActivity = userPresence.get(a.id)?.lastActivity || a.lastSeen;
      const bActivity = userPresence.get(b.id)?.lastActivity || b.lastSeen;
      return bActivity - aActivity;
    });
  }, [participants, currentUser, userPresence]);

  const visibleUsers = expanded ? otherUsers : otherUsers.slice(0, maxVisible);
  const hasMore = otherUsers.length > maxVisible;

  if (otherUsers.length === 0) return null;

  const getPositionStyles = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 1001,
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: '20px', left: '20px' };
      case 'bottom-left':
        return { ...base, bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { ...base, bottom: '20px', right: '20px' };
      default: // top-right
        return { ...base, top: '20px', right: '20px' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        ...getPositionStyles(),
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
        minWidth: '280px',
        maxWidth: '320px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
          }}
        >
          Active Participants ({otherUsers.length})
        </h3>
        
        {hasMore && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#3B82F6',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {expanded ? 'Show Less' : `+${otherUsers.length - maxVisible} more`}
          </motion.button>
        )}
      </div>

      {/* User list */}
      <AnimatePresence mode="popLayout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visibleUsers.map(user => {
            const presence = userPresence.get(user.id);
            const activityStatus = userActivityStatus.get(user.id) || 'offline';
            const stability = participantStability.get(user.id) || 1;

            return (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: onUserClick ? 'pointer' : 'default',
                }}
                whileHover={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                }}
                onClick={() => onUserClick?.(user)}
              >
                <EnhancedPresenceIndicator
                  user={user}
                  presence={presence}
                  activityStatus={activityStatus as any}
                  connectionQuality={connectionQuality as any}
                  stability={stability}
                  size="medium"
                  showName={true}
                  showDetails={true}
                  showActivity={true}
                  animated={true}
                />
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </motion.div>
  );
});

EnhancedPresenceList.displayName = 'EnhancedPresenceList';

/**
 * Collaboration notification component
 */
const CollaborationNotification = memo(({
  type,
  user,
  onDismiss,
}: {
  type: 'joined' | 'left' | 'annotation' | 'comment';
  user: CollaborationUser;
  onDismiss: () => void;
}) => {
  const getMessage = () => {
    switch (type) {
      case 'joined': return `${user.name} joined the session`;
      case 'left': return `${user.name} left the session`;
      case 'annotation': return `${user.name} added an annotation`;
      case 'comment': return `${user.name} added a comment`;
      default: return `${user.name} performed an action`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'joined': return '👋';
      case 'left': return '👋';
      case 'annotation': return '📝';
      case 'comment': return '💬';
      default: return '🔔';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '250px',
      }}
    >
      <span style={{ fontSize: '20px' }}>{getIcon()}</span>
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          {getMessage()}
        </div>
      </div>
      
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          color: '#6B7280',
        }}
      >
        ×
      </button>
    </motion.div>
  );
});

CollaborationNotification.displayName = 'CollaborationNotification';

/**
 * Hook for managing collaboration notifications
 */
function useCollaborationNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'joined' | 'left' | 'annotation' | 'comment';
    user: CollaborationUser;
    timestamp: number;
  }>>([]);

  const addNotification = useCallback((
    type: 'joined' | 'left' | 'annotation' | 'comment',
    user: CollaborationUser
  ) => {
    if (!enabled) return;

    const notification = {
      id: `${type}-${user.id}-${Date.now()}`,
      type,
      user,
      timestamp: Date.now(),
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, [enabled]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}

/**
 * Enhanced collaboration overlay component
 */
export const EnhancedCollaborationOverlay = memo<EnhancedCollaborationOverlayProps>(({
  showCursors = true,
  showSelections = true,
  showPresenceList = true,
  showConnectionStatus = true,
  showPerformanceMetrics = false,
  enableNotifications = true,
  presenceListPosition = 'top-right',
  className = '',
}) => {
  const {
    currentSession,
    currentUser,
    userPresence,
    connectionStatus,
    connectionQuality,
    networkMetrics,
    userActivityStatus,
    participantStability,
    getPerformanceMetrics,
    attemptRecovery,
  } = useEnhancedCollaborationStore();

  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const performanceMetrics = useMemo(() => getPerformanceMetrics(), [getPerformanceMetrics]);

  // Collaboration notifications
  const {
    notifications,
    addNotification,
    dismissNotification,
  } = useCollaborationNotifications(enableNotifications);

  // Enhanced presence tracking with throttling
  const lastUpdateTime = useRef(0);
  const updateThrottle = 100; // 10fps

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!currentUser || !currentSession) return;

    const now = Date.now();
    if (now - lastUpdateTime.current < updateThrottle) return;
    lastUpdateTime.current = now;

    // This would update presence through the enhanced store
    // The enhanced store has its own optimized presence tracking
  }, [currentUser, currentSession]);

  useEffect(() => {
    if (!currentUser || !currentSession) return;

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Handle retry connection
  const handleRetryConnection = useCallback(async () => {
    try {
      await attemptRecovery();
    } catch (error) {
      console.error('Failed to retry connection:', error);
    }
  }, [attemptRecovery]);

  // Don't render if no active session
  if (!currentSession || !currentUser) {
    return null;
  }

  const otherUsers = Array.from(currentSession.participants.values()).filter(
    user => user.id !== currentUser.id
  );

  return (
    <>
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
        aria-label="Enhanced collaboration overlay"
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
      </div>

      {/* Connection status indicator */}
      <AnimatePresence>
        {showConnectionStatus && connectionStatus !== 'connected' && (
          <ConnectionStatusIndicator
            connectionStatus={connectionStatus}
            connectionQuality={connectionQuality}
            networkMetrics={networkMetrics}
            onRetry={handleRetryConnection}
          />
        )}
      </AnimatePresence>

      {/* Enhanced presence list */}
      <AnimatePresence>
        {showPresenceList && otherUsers.length > 0 && (
          <EnhancedPresenceList
            participants={currentSession.participants}
            userPresence={userPresence}
            userActivityStatus={userActivityStatus}
            participantStability={participantStability}
            connectionQuality={connectionQuality}
            currentUser={currentUser}
            position={presenceListPosition}
            onUserClick={(user) => {
              console.log('User clicked:', user);
              // Could implement focus on user's location
            }}
          />
        )}
      </AnimatePresence>

      {/* Performance metrics panel */}
      <AnimatePresence>
        {showPerformancePanel && (
          <PerformanceMetricsPanel
            metrics={performanceMetrics}
            onClose={() => setShowPerformancePanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Performance metrics toggle */}
      {showPerformanceMetrics && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPerformancePanel(!showPerformancePanel)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '20px',
            zIndex: 1001,
            pointerEvents: 'auto',
          }}
          title="Performance Metrics"
        >
          📊
        </motion.button>
      )}

      {/* Notifications container */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 1002,
              pointerEvents: 'auto',
            }}
          >
            {notifications.map(notification => (
              <CollaborationNotification
                key={notification.id}
                type={notification.type}
                user={notification.user}
                onDismiss={() => dismissNotification(notification.id)}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

EnhancedCollaborationOverlay.displayName = 'EnhancedCollaborationOverlay';