/**
 * Annotation creator component
 * Provides UI for creating new annotations with type selection and content input
 */

import { 
  IconNote, 
  IconBookmark, 
  IconQuestionMark, 
  IconChecklist, 
  IconAlertTriangle, 
  IconExternalLink,
  IconHighlight,
  IconX,
  IconCheck,
  IconTag
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useCollaborationStore } from '@/stores/collaboration-store';
import type { AnnotationType, AnnotationTarget } from '@/types/collaboration';

export interface AnnotationCreatorProps {
  /** Target being annotated */
  target: AnnotationTarget;
  /** Initial position for the creator */
  position: {
    x: number;
    y: number;
  };
  /** Initial annotation type */
  initialType?: AnnotationType;
  /** Initial content */
  initialContent?: string;
  /** Whether the creator is visible */
  isOpen: boolean;
  /** Callback when annotation is created */
  onAnnotationCreate?: (annotationId: string) => void;
  /** Callback when creator is cancelled */
  onCancel?: () => void;
  /** Callback when creator is closed */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Annotation type configuration
 */
const ANNOTATION_TYPES: Array<{
  type: AnnotationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string }>;
  color: string;
}> = [
  {
    type: 'highlight',
    label: 'Highlight',
    description: 'Mark important text or content',
    icon: IconHighlight,
    color: '#F59E0B',
  },
  {
    type: 'note',
    label: 'Note',
    description: 'Add detailed observations or insights',
    icon: IconNote,
    color: '#3B82F6',
  },
  {
    type: 'bookmark',
    label: 'Bookmark',
    description: 'Save for later reference',
    icon: IconBookmark,
    color: '#10B981',
  },
  {
    type: 'question',
    label: 'Question',
    description: 'Ask questions or seek clarification',
    icon: IconQuestionMark,
    color: '#F59E0B',
  },
  {
    type: 'todo',
    label: 'Todo',
    description: 'Create action items or tasks',
    icon: IconChecklist,
    color: '#6366F1',
  },
  {
    type: 'warning',
    label: 'Warning',
    description: 'Flag potential issues or concerns',
    icon: IconAlertTriangle,
    color: '#EF4444',
  },
  {
    type: 'reference',
    label: 'Reference',
    description: 'Link to external resources',
    icon: IconExternalLink,
    color: '#8B5CF6',
  },
];

/**
 * Type selector component
 */
const TypeSelector = ({ 
  selectedType, 
  onTypeSelect 
}: { 
  selectedType: AnnotationType;
  onTypeSelect: (type: AnnotationType) => void;
}) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    }}>
      Annotation Type
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
    }}>
      {ANNOTATION_TYPES.map(({ type, label, icon: Icon, color }) => {
        const isSelected = selectedType === type;
        return (
          <button
            key={type}
            onClick={() => onTypeSelect(type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 4px',
              border: isSelected ? `2px solid ${color}` : '1px solid #E5E7EB',
              borderRadius: '6px',
              backgroundColor: isSelected ? `${color}10` : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={ANNOTATION_TYPES.find(t => t.type === type)?.description}
          >
            <span style={{ color: isSelected ? color : '#6B7280' }}>
              <Icon size={16} />
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: '500',
              color: isSelected ? color : '#6B7280',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Content editor component
 */
const ContentEditor = ({ 
  content, 
  onChange, 
  placeholder 
}: { 
  content: string;
  onChange: (content: string) => void;
  placeholder: string;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        Content
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '80px',
        }}
      />
      <div style={{
        fontSize: '11px',
        color: '#6B7280',
        textAlign: 'right',
        marginTop: '4px',
      }}>
        {content.length}/500
      </div>
    </div>
  );
};

/**
 * Tag editor component
 */
const TagEditor = ({ 
  tags, 
  onChange 
}: { 
  tags: string[];
  onChange: (tags: string[]) => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };
  
  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        Tags (optional)
      </div>
      
      {/* Tag list */}
      {tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '8px',
        }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: '500',
              }}
            >
              <IconTag size={10} />
              {tag}
              <button
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0,
                  marginLeft: '2px',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* Tag input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
          }
        }}
        placeholder="Add tags (press Enter or comma to add)"
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid #D1D5DB',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      />
    </div>
  );
};

/**
 * Annotation creator component
 */
export const AnnotationCreator = ({
  target,
  position,
  initialType = 'note',
  initialContent = '',
  isOpen,
  onAnnotationCreate,
  onCancel,
  onClose,
  className,
  'data-testid': testId,
}: AnnotationCreatorProps) => {
  const { createAnnotation, currentUser } = useCollaborationStore();
  
  const [selectedType, setSelectedType] = useState<AnnotationType>(initialType);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel?.();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onCancel]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);
  
  const handleCreate = useCallback(async () => {
    if (!currentUser || !content.trim()) {
      setError('Content is required');
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      const annotationId = await createAnnotation({
        type: selectedType,
        target,
        content: content.trim(),
        author: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          colour: currentUser.colour,
        },
        visibility: 'team', // Default to team visibility
        status: 'published',
        tags,
        reactions: [],
        commentIds: [],
        position: {
          x: position.x,
          y: position.y,
          anchor: 'center',
        },
      });
      
      onAnnotationCreate?.(annotationId);
      onClose?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create annotation');
    } finally {
      setIsCreating(false);
    }
  }, [createAnnotation, currentUser, selectedType, target, content, tags, position, onAnnotationCreate, onClose]);
  
  const handleCancel = useCallback(() => {
    setContent('');
    setTags([]);
    setError(null);
    onCancel?.();
  }, [onCancel]);
  
  if (!isOpen) return null;
  
  const selectedTypeConfig = ANNOTATION_TYPES.find(t => t.type === selectedType);
  
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        width: '350px',
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        padding: '20px',
        zIndex: 2000,
      }}
      className={className}
      data-testid={testId}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {selectedTypeConfig && (
            <span style={{ color: selectedTypeConfig.color }}>
              <selectedTypeConfig.icon size={18} />
            </span>
          )}
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
          }}>
            Create Annotation
          </h3>
        </div>
        <button
          onClick={handleCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <IconX size={16} />
        </button>
      </div>
      
      {/* Target info */}
      <div style={{
        fontSize: '12px',
        color: '#6B7280',
        marginBottom: '16px',
        padding: '8px',
        backgroundColor: '#F9FAFB',
        borderRadius: '6px',
      }}>
        Annotating: <strong>{target.title}</strong>
      </div>
      
      {/* Error message */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}
      
      {/* Type selector */}
      <TypeSelector 
        selectedType={selectedType}
        onTypeSelect={setSelectedType}
      />
      
      {/* Content editor */}
      <ContentEditor
        content={content}
        onChange={setContent}
        placeholder={`Write your ${selectedType}...`}
      />
      
      {/* Tag editor */}
      <TagEditor
        tags={tags}
        onChange={setTags}
      />
      
      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCancel}
          disabled={isCreating}
          style={{
            padding: '8px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating || !content.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: selectedTypeConfig?.color || '#3B82F6',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isCreating || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: isCreating || !content.trim() ? 0.6 : 1,
          }}
        >
          <IconCheck size={14} />
          {isCreating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </motion.div>
  );
};