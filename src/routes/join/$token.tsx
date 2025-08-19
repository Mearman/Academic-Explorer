/**
 * Join session route for handling shareable links
 * Allows users to join collaboration sessions via shared URLs
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import { useSessionSharing } from '@/hooks/use-session-sharing';
import { useCollaborationStore } from '@/stores/collaboration-store';
import type { CollaborationUser } from '@/types/collaboration';

/**
 * User info form for anonymous users
 */
const UserInfoForm = ({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (userInfo: Partial<CollaborationUser>) => void;
  isLoading: boolean;
}) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        avatar: avatar.trim() || undefined,
      });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      <h2 style={{
        fontSize: '24px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        Join Collaboration
      </h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px',
        }}>
          Your Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px',
        }}>
          Avatar URL (optional)
        </label>
        <input
          type="url"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!name.trim() || isLoading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: !name.trim() || isLoading ? '#9CA3AF' : '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: !name.trim() || isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Joining...' : 'Join Session'}
      </button>
    </motion.form>
  );
};

/**
 * Session info display
 */
const SessionInfo = ({ 
  session, 
  permissions, 
  expiresAt 
}: { 
  session: any;
  permissions: any;
  expiresAt: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      marginBottom: '24px',
      maxWidth: '400px',
    }}
  >
    <h3 style={{
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '16px',
    }}>
      {session.title}
    </h3>

    {session.description && (
      <p style={{
        fontSize: '14px',
        color: '#6B7280',
        marginBottom: '16px',
        lineHeight: 1.5,
      }}>
        {session.description}
      </p>
    )}

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#6B7280',
    }}>
      <span>Permission: {permissions?.canEdit ? 'Editor' : permissions?.canAnnotate ? 'Annotator' : 'Viewer'}</span>
      <span>Expires: {new Date(expiresAt).toLocaleDateString()}</span>
    </div>
  </motion.div>
);

/**
 * Error display
 */
const ErrorDisplay = ({ 
  error, 
  onRetry 
}: { 
  error: string;
  onRetry: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '32px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px',
      textAlign: 'center',
    }}
  >
    <div style={{
      fontSize: '48px',
      marginBottom: '16px',
    }}>
      ⚠️
    </div>

    <h2 style={{
      fontSize: '20px',
      fontWeight: '600',
      color: '#DC2626',
      marginBottom: '16px',
    }}>
      Unable to Join Session
    </h2>

    <p style={{
      fontSize: '14px',
      color: '#6B7280',
      marginBottom: '24px',
      lineHeight: 1.5,
    }}>
      {error}
    </p>

    <button
      onClick={onRetry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
      }}
    >
      Try Again
    </button>
  </motion.div>
);

/**
 * Join session page component
 */
function JoinSessionPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { currentUser } = useCollaborationStore();
  const { 
    getSessionInfoFromToken, 
    joinViaToken, 
    error: sharingError 
  } = useSessionSharing();

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load session info from token
   */
  const loadSessionInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await getSessionInfoFromToken(token);
      
      if (!info.isValid) {
        throw new Error('This share link has expired or is no longer valid');
      }
      
      setSessionInfo(info);
      
      // If user is already logged in, join automatically
      if (currentUser) {
        await handleJoinSession({});
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session information');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle joining the session
   */
  const handleJoinSession = async (userInfo: Partial<CollaborationUser>) => {
    try {
      setIsJoining(true);
      setError(null);
      
      await joinViaToken(token, userInfo);
      
      // Navigate to the session
      navigate({ to: '/' }); // Or to a specific session route
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setIsJoining(false);
    }
  };

  // Load session info on mount
  useEffect(() => {
    loadSessionInfo();
  }, [token]);

  // Handle sharing errors
  useEffect(() => {
    if (sharingError) {
      setError(sharingError);
    }
  }, [sharingError]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            fontSize: '16px',
            color: '#6B7280',
          }}>
            Loading session information...
          </p>
        </motion.div>
      )}

      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={loadSessionInfo}
        />
      )}

      {sessionInfo && !error && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}>
          <SessionInfo
            session={sessionInfo.session}
            permissions={sessionInfo.permissions}
            expiresAt={sessionInfo.expiresAt}
          />

          {!currentUser && (
            <UserInfoForm
              onSubmit={handleJoinSession}
              isLoading={isJoining}
            />
          )}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

/**
 * Route definition
 */
export const Route = createFileRoute('/join/$token')({
  component: JoinSessionPage,
  validateSearch: () => ({}),
});