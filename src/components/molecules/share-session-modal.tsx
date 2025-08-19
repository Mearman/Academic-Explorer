/**
 * Share session modal component
 * Allows users to create shareable links and send invitations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';

import { useSessionSharing } from '@/hooks/use-session-sharing';
import type { PermissionLevel } from '@/types/collaboration';
import { PERMISSION_LEVELS } from '@/types/collaboration';

export interface ShareSessionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close modal handler */
  onClose: () => void;
  /** Session title for display */
  sessionTitle?: string;
}

/**
 * Permission level selector
 */
const PermissionSelector = ({ 
  value, 
  onChange 
}: { 
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
}) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px',
    }}>
      Permission Level
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PermissionLevel)}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: 'white',
      }}
    >
      <option value="viewer">Viewer - Can view session</option>
      <option value="annotator">Annotator - Can add annotations and comments</option>
      <option value="editor">Editor - Can edit others' annotations</option>
      <option value="admin">Admin - Can manage session settings</option>
    </select>
  </div>
);

/**
 * Expiry selector
 */
const ExpirySelector = ({ 
  value, 
  onChange 
}: { 
  value: number;
  onChange: (milliseconds: number) => void;
}) => {
  const options = [
    { label: '1 hour', value: 60 * 60 * 1000 },
    { label: '24 hours', value: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
    { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Never', value: 365 * 24 * 60 * 60 * 1000 }, // 1 year as "never"
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '8px',
      }}>
        Link Expires
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: 'white',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Tab navigation
 */
const TabButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
      backgroundColor: 'transparent',
      color: active ? '#3B82F6' : '#6B7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    {children}
  </button>
);

/**
 * Share session modal
 */
export const ShareSessionModal = ({ 
  isOpen, 
  onClose, 
  sessionTitle = 'Collaboration Session' 
}: ShareSessionModalProps) => {
  const { 
    shareableLinks, 
    createShareableLink, 
    revokeShareableLink,
    sendInvitation,
    isLoading,
    error 
  } = useSessionSharing();

  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');
  const [permissions, setPermissions] = useState<PermissionLevel>('annotator');
  const [expiry, setExpiry] = useState(7 * 24 * 60 * 60 * 1000); // 7 days
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  /**
   * Create shareable link
   */
  const handleCreateLink = useCallback(async () => {
    try {
      setIsCreating(true);
      const link = await createShareableLink({
        permissions,
        expiresIn: expiry,
        allowAnonymous,
        maxUses,
      });
      
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(link.url);
      setCopiedToken(link.token);
      setTimeout(() => setCopiedToken(null), 3000);
      
    } catch (err) {
      console.error('Failed to create shareable link:', err);
    } finally {
      setIsCreating(false);
    }
  }, [createShareableLink, permissions, expiry, allowAnonymous, maxUses]);

  /**
   * Send email invitation
   */
  const handleSendInvitation = useCallback(async () => {
    if (!email.trim()) return;
    
    try {
      setIsCreating(true);
      await sendInvitation({
        email: email.trim(),
        permissions,
        message: message.trim() || undefined,
        expiresIn: expiry,
      });
      
      // Reset form
      setEmail('');
      setMessage('');
      
    } catch (err) {
      console.error('Failed to send invitation:', err);
    } finally {
      setIsCreating(false);
    }
  }, [sendInvitation, email, permissions, message, expiry]);

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = useCallback(async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
          }}>
            Share {sessionTitle}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <TabButton
            active={activeTab === 'link'}
            onClick={() => setActiveTab('link')}
          >
            Share Link
          </TabButton>
          <TabButton
            active={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
          >
            Email Invitation
          </TabButton>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'link' && (
              <motion.div
                key="link-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <PermissionSelector value={permissions} onChange={setPermissions} />
                <ExpirySelector value={expiry} onChange={setExpiry} />
                
                {/* Advanced options */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    <input
                      type="checkbox"
                      checked={allowAnonymous}
                      onChange={(e) => setAllowAnonymous(e.target.checked)}
                    />
                    Allow anonymous access
                  </label>
                  
                  <div style={{ marginTop: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      Maximum uses (optional)
                    </label>
                    <input
                      type="number"
                      value={maxUses || ''}
                      onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Unlimited"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateLink}
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.6 : 1,
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create Share Link'}
                </button>

                {/* Existing links */}
                {shareableLinks.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px',
                    }}>
                      Active Links
                    </h4>
                    {shareableLinks.map(link => (
                      <div
                        key={link.token}
                        style={{
                          padding: '12px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '6px',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#374151',
                            textTransform: 'capitalize',
                          }}>
                            {link.permissions}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleCopyLink(link.url, link.token)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: copiedToken === link.token ? '#10B981' : '#6B7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedToken === link.token ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => revokeShareableLink(link.token)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#6B7280',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}>
                          {link.url}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                          Expires: {new Date(link.expiresAt).toLocaleDateString()}
                          {link.maxUses && ` • Uses: ${link.currentUses}/${link.maxUses}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                key="email-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@university.edu"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <PermissionSelector value={permissions} onChange={setPermissions} />
                <ExpirySelector value={expiry} onChange={setExpiry} />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Personal Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I'd like to invite you to collaborate on this research session..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  onClick={handleSendInvitation}
                  disabled={!email.trim() || isCreating}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: !email.trim() || isCreating ? '#9CA3AF' : '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: !email.trim() || isCreating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isCreating ? 'Sending...' : 'Send Invitation'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};