/**
 * Annotation panel component
 * Displays list of annotations with filtering, sorting, and management capabilities
 */

import { 
  IconNote, 
  IconBookmark, 
  IconQuestionMark, 
  IconChecklist, 
  IconAlertTriangle, 
  IconExternalLink,
  IconHighlight,
  IconSearch,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
  IconUser,
  IconClock,
  IconTag,
  IconHeart,
  IconMessageCircle
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useCallback } from 'react';

import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  AnnotationType, 
  CollaborationUser 
} from '@/types/collaboration';

export interface AnnotationPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Current route for filtering annotations */
  currentRoute?: string;
  /** Whether to show only user's own annotations */
  showOnlyOwn?: boolean;
  /** Panel width */
  width?: number;
  /** Callback when annotation is selected */
  onAnnotationSelect?: (annotation: Annotation) => void;
  /** Callback when annotation is edited */
  onAnnotationEdit?: (annotation: Annotation) => void;
  /** Callback when annotation is deleted */
  onAnnotationDelete?: (annotationId: string) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Sort options for annotations
 */
type SortOption = 'newest' | 'oldest' | 'type' | 'author';

/**
 * Annotation type icons
 */
const TYPE_ICONS: Record<AnnotationType, React.ComponentType<{ size?: number | string }>> = {
  highlight: IconHighlight,
  note: IconNote,
  bookmark: IconBookmark,
  question: IconQuestionMark,
  todo: IconChecklist,
  warning: IconAlertTriangle,
  reference: IconExternalLink,
};

/**
 * Annotation type colours
 */
const TYPE_COLOURS: Record<AnnotationType, string> = {
  highlight: '#F59E0B',
  note: '#3B82F6',
  bookmark: '#10B981',
  question: '#F59E0B',
  todo: '#6366F1',
  warning: '#EF4444',
  reference: '#8B5CF6',
};

/**
 * Annotation item component
 */
const AnnotationItem = ({ 
  annotation, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  currentUser 
}: {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: (annotation: Annotation) => void;
  onEdit?: (annotation: Annotation) => void;
  onDelete?: (annotationId: string) => void;
  currentUser: CollaborationUser | null;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = TYPE_ICONS[annotation.type];
  const colour = TYPE_COLOURS[annotation.type];
  
  const canEdit = currentUser?.permissions.canEdit || annotation.author.id === currentUser?.id;
  const canDelete = currentUser?.permissions.canEdit || annotation.author.id === currentUser?.id;
  
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={() => onSelect(annotation)}
      style={{
        padding: '12px',
        backgroundColor: isSelected ? '#F9FAFB' : 'white',
        border: isSelected ? `2px solid ${colour}` : '1px solid #E5E7EB',
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      whileHover={{ backgroundColor: '#F9FAFB' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ color: colour }}>
            <Icon size={14} />
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colour,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {annotation.type}
          </span>
        </div>
        
        {/* Menu button */}
        {(canEdit || canDelete) && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <IconDots size={14} />
            </button>
            
            {/* Context menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '120px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {canEdit && (
                    <button
                      onClick={() => {
                        onEdit?.(annotation);
                        setShowMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#374151',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <IconEdit size={12} />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        onDelete?.(annotation.id);
                        setShowMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#EF4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <IconTrash size={12} />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div style={{
        fontSize: '13px',
        color: '#374151',
        lineHeight: 1.4,
        marginBottom: '8px',
      }}>
        {annotation.content}
      </div>
      
      {/* Tags */}
      {annotation.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '8px',
        }}>
          {annotation.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                backgroundColor: `${colour}20`,
                color: colour,
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: '500',
              }}
            >
              {tag}
            </span>
          ))}
          {annotation.tags.length > 3 && (
            <span style={{
              fontSize: '10px',
              color: '#6B7280',
            }}>
              +{annotation.tags.length - 3}
            </span>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#6B7280',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <IconUser size={10} />
            {annotation.author.name}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <IconClock size={10} />
            {formatTimeAgo(annotation.createdAt)}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {annotation.reactions.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              <IconHeart size={10} />
              {annotation.reactions.length}
            </div>
          )}
          {annotation.commentIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              <IconMessageCircle size={10} />
              {annotation.commentIds.length}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Annotation panel component
 */
export const AnnotationPanel = ({
  isOpen,
  currentRoute = window.location.pathname,
  showOnlyOwn = false,
  width = 300,
  onAnnotationSelect,
  onAnnotationEdit,
  onAnnotationDelete,
  onClose,
  className,
  'data-testid': testId,
}: AnnotationPanelProps) => {
  const { 
    annotations, 
    currentUser, 
    deleteAnnotation 
  } = useCollaborationStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<AnnotationType>>(
    new Set(['highlight', 'note', 'bookmark', 'question', 'todo', 'warning', 'reference'])
  );
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  
  // Filter and sort annotations
  const filteredAnnotations = useMemo(() => {
    const annotationArray = Array.from(annotations.values());
    
    return annotationArray
      .filter(annotation => {
        // Route filter
        if (annotation.target.url !== currentRoute) {
          return false;
        }
        
        // Own annotations filter
        if (showOnlyOwn && annotation.author.id !== currentUser?.id) {
          return false;
        }
        
        // Type filter
        if (!selectedTypes.has(annotation.type)) {
          return false;
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            annotation.content.toLowerCase().includes(query) ||
            annotation.tags.some(tag => tag.toLowerCase().includes(query)) ||
            annotation.author.name.toLowerCase().includes(query)
          );
        }
        
        // Status filter
        return annotation.status === 'published';
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return b.createdAt - a.createdAt;
          case 'oldest':
            return a.createdAt - b.createdAt;
          case 'type':
            return a.type.localeCompare(b.type);
          case 'author':
            return a.author.name.localeCompare(b.author.name);
          default:
            return 0;
        }
      });
  }, [annotations, currentRoute, showOnlyOwn, currentUser, selectedTypes, searchQuery, sortBy]);
  
  // Handle annotation selection
  const handleAnnotationSelect = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation.id);
    onAnnotationSelect?.(annotation);
  }, [onAnnotationSelect]);
  
  // Handle annotation deletion
  const handleAnnotationDelete = useCallback(async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
      onAnnotationDelete?.(annotationId);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  }, [deleteAnnotation, onAnnotationDelete]);
  
  // Toggle annotation type filter
  const toggleTypeFilter = useCallback((type: AnnotationType) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ x: width }}
      animate={{ x: 0 }}
      exit={{ x: width }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: `${width}px`,
        height: '100vh',
        backgroundColor: 'white',
        borderLeft: '1px solid #E5E7EB',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.1)',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
      data-testid={testId}
    >
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
          }}>
            Annotations
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>
        
        {/* Search */}
        <div style={{
          position: 'relative',
          marginBottom: '12px',
        }}>
          <IconSearch
            size={16}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
            }}
          />
          <input
            type="text"
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 8px 8px 28px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
        </div>
        
        {/* Filters and sort */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              padding: '4px 8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: 'white',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="type">By type</option>
            <option value="author">By author</option>
          </select>
          
          <div style={{
            fontSize: '11px',
            color: '#6B7280',
          }}>
            {filteredAnnotations.length} of {Array.from(annotations.values()).length}
          </div>
        </div>
      </div>
      
      {/* Type filters */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {(Object.keys(TYPE_ICONS) as AnnotationType[]).map(type => {
            const Icon = TYPE_ICONS[type];
            const colour = TYPE_COLOURS[type];
            const isSelected = selectedTypes.has(type);
            
            return (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  border: isSelected ? `1px solid ${colour}` : '1px solid #E5E7EB',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? `${colour}10` : 'white',
                  fontSize: '10px',
                  fontWeight: '500',
                  color: isSelected ? colour : '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={10} />
                {type}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Annotation list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
      }}>
        {filteredAnnotations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '14px',
            marginTop: '40px',
          }}>
            {searchQuery ? 'No annotations match your search' : 'No annotations on this page'}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <AnimatePresence>
              {filteredAnnotations.map(annotation => (
                <AnnotationItem
                  key={annotation.id}
                  annotation={annotation}
                  isSelected={selectedAnnotation === annotation.id}
                  onSelect={handleAnnotationSelect}
                  onEdit={onAnnotationEdit}
                  onDelete={handleAnnotationDelete}
                  currentUser={currentUser}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};