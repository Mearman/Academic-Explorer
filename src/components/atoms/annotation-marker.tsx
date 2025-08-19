/**
 * Annotation marker component
 * Displays visual indicators for annotations on the page
 */

import { 
  IconNote, 
  IconBookmark, 
  IconQuestionMark, 
  IconChecklist, 
  IconAlertTriangle, 
  IconExternalLink,
  IconHighlight
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState } from 'react';

import type { AnnotationType, Annotation } from '@/types/collaboration';

export interface AnnotationMarkerProps {
  /** Annotation data */
  annotation: Annotation;
  /** Whether the annotation is selected */
  isSelected?: boolean;
  /** Whether to show the annotation preview */
  showPreview?: boolean;
  /** Marker position */
  position: {
    x: number;
    y: number;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the marker is interactive */
  interactive?: boolean;
  /** Click handler */
  onClick?: (annotation: Annotation) => void;
  /** Hover handlers */
  onMouseEnter?: (annotation: Annotation) => void;
  onMouseLeave?: (annotation: Annotation) => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get icon for annotation type
 */
function getAnnotationIcon(type: AnnotationType): React.ComponentType<{ size?: number | string }> {
  const iconMap: Record<AnnotationType, React.ComponentType<{ size?: number | string }>> = {
    highlight: IconHighlight,
    note: IconNote,
    bookmark: IconBookmark,
    question: IconQuestionMark,
    todo: IconChecklist,
    warning: IconAlertTriangle,
    reference: IconExternalLink,
  };
  
  return iconMap[type] || IconNote;
}

/**
 * Get colour scheme for annotation type
 */
function getAnnotationColours(type: AnnotationType): {
  background: string;
  border: string;
  text: string;
} {
  const colourMap: Record<AnnotationType, { background: string; border: string; text: string }> = {
    highlight: { background: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    note: { background: '#DBEAFE', border: '#3B82F6', text: '#1D4ED8' },
    bookmark: { background: '#D1FAE5', border: '#10B981', text: '#047857' },
    question: { background: '#FDE68A', border: '#F59E0B', text: '#92400E' },
    todo: { background: '#E0E7FF', border: '#6366F1', text: '#4338CA' },
    warning: { background: '#FEE2E2', border: '#EF4444', text: '#DC2626' },
    reference: { background: '#F3E8FF', border: '#8B5CF6', text: '#6D28D9' },
  };
  
  return colourMap[type];
}

/**
 * Preview tooltip component
 */
const AnnotationPreview = memo<{
  annotation: Annotation;
  onClose: () => void;
}>(({ annotation, onClose }) => {
  const colours = getAnnotationColours(annotation.type);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px',
        minWidth: '200px',
        maxWidth: '300px',
        backgroundColor: 'white',
        border: `2px solid ${colours.border}`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {/* Preview header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colours.text,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {annotation.type}
          </span>
          <span style={{
            fontSize: '10px',
            color: '#6B7280',
          }}>
            by {annotation.author.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px',
          }}
        >
          ×
        </button>
      </div>
      
      {/* Preview content */}
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
          marginTop: '8px',
        }}>
          {annotation.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                backgroundColor: colours.background,
                color: colours.text,
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
      
      {/* Arrow pointer */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: `6px solid ${colours.border}`,
      }} />
    </motion.div>
  );
});

AnnotationPreview.displayName = 'AnnotationPreview';

/**
 * Annotation marker component
 */
export const AnnotationMarker = memo<AnnotationMarkerProps>(({
  annotation,
  isSelected = false,
  showPreview = false,
  position,
  size = 'md',
  interactive = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
  'data-testid': testId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const Icon = getAnnotationIcon(annotation.type);
  const colours = getAnnotationColours(annotation.type);
  
  // Size configurations
  const sizeConfig = {
    sm: { size: 16, padding: 4, iconSize: 12 },
    md: { size: 20, padding: 6, iconSize: 14 },
    lg: { size: 24, padding: 8, iconSize: 16 },
  };
  
  const config = sizeConfig[size];
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(annotation);
  };
  
  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
    onMouseEnter?.(annotation);
    // Show tooltip after delay
    setTimeout(() => setShowTooltip(true), 500);
  };
  
  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setShowTooltip(false);
    onMouseLeave?.(annotation);
  };
  
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 1001 : 1000,
      }}
      className={className}
      data-testid={testId}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        whileHover={interactive ? { scale: 1.1 } : undefined}
        whileTap={interactive ? { scale: 0.95 } : undefined}
        style={{
          width: config.size,
          height: config.size,
          backgroundColor: isSelected || isHovered ? colours.border : colours.background,
          border: `2px solid ${colours.border}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: interactive ? 'pointer' : 'default',
          boxShadow: isSelected 
            ? `0 0 0 3px ${colours.border}40` 
            : '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-annotation-id={annotation.id}
        data-annotation-type={annotation.type}
      >
        <span
          style={{
            color: isSelected || isHovered ? 'white' : colours.text,
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={config.iconSize} />
        </span>
      </motion.div>
      
      {/* Preview tooltip */}
      <AnimatePresence>
        {showTooltip && showPreview && (
          <AnnotationPreview
            annotation={annotation}
            onClose={() => setShowTooltip(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Pulse animation for new annotations */}
      {annotation.createdAt > Date.now() - 5000 && (
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, repeat: 2 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: config.size,
            height: config.size,
            backgroundColor: colours.border,
            borderRadius: '50%',
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
});

AnnotationMarker.displayName = 'AnnotationMarker';