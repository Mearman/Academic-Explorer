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
 * Size configuration for annotation markers
 */
const MARKER_SIZE_CONFIG = {
  sm: { size: 16, padding: 4, iconSize: 12 },
  md: { size: 20, padding: 6, iconSize: 14 },
  lg: { size: 24, padding: 8, iconSize: 16 },
} as const;

/**
 * Configuration for annotation types
 */
const ANNOTATION_CONFIG = {
  highlight: { 
    icon: IconHighlight,
    colours: { background: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  },
  note: { 
    icon: IconNote,
    colours: { background: '#DBEAFE', border: '#3B82F6', text: '#1D4ED8' },
  },
  bookmark: { 
    icon: IconBookmark,
    colours: { background: '#D1FAE5', border: '#10B981', text: '#047857' },
  },
  question: { 
    icon: IconQuestionMark,
    colours: { background: '#FDE68A', border: '#F59E0B', text: '#92400E' },
  },
  todo: { 
    icon: IconChecklist,
    colours: { background: '#E0E7FF', border: '#6366F1', text: '#4338CA' },
  },
  warning: { 
    icon: IconAlertTriangle,
    colours: { background: '#FEE2E2', border: '#EF4444', text: '#DC2626' },
  },
  reference: { 
    icon: IconExternalLink,
    colours: { background: '#F3E8FF', border: '#8B5CF6', text: '#6D28D9' },
  },
} as const;

/**
 * Get icon for annotation type
 */
function getAnnotationIcon(type: AnnotationType): React.ComponentType<{ size?: number | string }> {
  return ANNOTATION_CONFIG[type]?.icon ?? IconNote;
}

/**
 * Get colour scheme for annotation type
 */
function getAnnotationColours(type: AnnotationType): {
  background: string;
  border: string;
  text: string;
} {
  return ANNOTATION_CONFIG[type]?.colours ?? ANNOTATION_CONFIG.note.colours;
}


/**
 * Preview tooltip component
 */
const AnnotationPreview = memo<{
  annotation: Annotation;
  onClose: () => void;
}>(({ annotation, onClose }) => {
  const colours = getAnnotationColours(annotation.type);
  
  const header = renderPreviewHeader(annotation, colours, onClose);
  const content = renderPreviewContent(annotation.content);
  const tags = renderPreviewTags(annotation.tags || [], colours);
  const arrow = renderPreviewArrow(colours.border);
  
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
      {header}
      {content}
      {tags}
      {arrow}
    </motion.div>
  );
});

AnnotationPreview.displayName = 'AnnotationPreview';

/**
 * Create mouse interaction handlers
 */
function createMouseHandlers(
  interactive: boolean,
  setIsHovered: (hovered: boolean) => void,
  setShowTooltip: (show: boolean) => void,
  onMouseEnter?: (annotation: Annotation) => void,
  onMouseLeave?: (annotation: Annotation) => void,
  annotation?: Annotation
) {
  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
    onMouseEnter?.(annotation!);
    setTimeout(() => setShowTooltip(true), 500);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setShowTooltip(false);
    onMouseLeave?.(annotation!);
  };

  return { handleMouseEnter, handleMouseLeave };
}

/**
 * Render pulse animation for new annotations
 */
function renderPulseAnimation(
  annotation: Annotation,
  config: { size: number; padding: number; iconSize: number },
  colours: { background: string; border: string; text: string }
): React.ReactNode {
  if (annotation.createdAt <= Date.now() - 5000) return null;
  
  return (
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
  );
}

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
  
  const config = MARKER_SIZE_CONFIG[size];
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(annotation);
  };
  
  const { handleMouseEnter, handleMouseLeave } = createMouseHandlers(
    interactive,
    setIsHovered,
    setShowTooltip,
    onMouseEnter,
    onMouseLeave,
    annotation
  );
  
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
      {renderPulseAnimation(annotation, config, colours)}
    </div>
  );
});

AnnotationMarker.displayName = 'AnnotationMarker';