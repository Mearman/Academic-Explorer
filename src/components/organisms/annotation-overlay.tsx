/**
 * Annotation overlay component
 * Manages the display and interaction of annotations across the application
 */

import { 
  IconPlus, 
  IconEye, 
  IconEyeOff,
  IconFilter,
  IconSettings
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { AnnotationMarker } from '@/components/atoms/annotation-marker';
import { AnnotationCreator } from '@/components/molecules/annotation-creator';
import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  AnnotationType, 
  AnnotationTarget 
} from '@/types/collaboration';

export interface AnnotationOverlayProps {
  /** Whether annotations are visible */
  showAnnotations?: boolean;
  /** Whether to allow creating new annotations */
  allowCreation?: boolean;
  /** Filter annotations by type */
  typeFilter?: AnnotationType[];
  /** Filter annotations by author */
  authorFilter?: string[];
  /** Whether to show annotation previews on hover */
  showPreviews?: boolean;
  /** Current page/route for filtering relevant annotations */
  currentRoute?: string;
  /** Target information for new annotations */
  currentTarget?: AnnotationTarget;
  /** Callback when annotation is clicked */
  onAnnotationClick?: (annotation: Annotation) => void;
  /** Callback when annotation creation is triggered */
  onAnnotationCreate?: (target: AnnotationTarget, position: { x: number; y: number }) => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Annotation overlay component
 */
export const AnnotationOverlay = ({
  showAnnotations = true,
  allowCreation = true,
  typeFilter,
  authorFilter,
  showPreviews = true,
  currentRoute = window.location.pathname,
  currentTarget,
  onAnnotationClick,
  onAnnotationCreate,
  className,
  'data-testid': testId,
}: AnnotationOverlayProps) => {
  const { 
    annotations, 
    currentUser, 
    currentSession 
  } = useCollaborationStore();
  
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [creatorState, setCreatorState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    target: AnnotationTarget | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null,
  });
  const [overlaySettings, setOverlaySettings] = useState({
    showTypes: new Set<AnnotationType>(['highlight', 'note', 'bookmark', 'question', 'todo', 'warning', 'reference']),
    showAuthors: new Set<string>(),
    opacity: 1,
  });
  
  // Filter annotations based on current route and filters
  const filteredAnnotations = useMemo(() => {
    const annotationArray = Array.from(annotations.values());
    
    return annotationArray.filter(annotation => {
      // Route filter
      if (annotation.target.url !== currentRoute) {
        return false;
      }
      
      // Type filter
      if (typeFilter && !typeFilter.includes(annotation.type)) {
        return false;
      }
      
      if (!overlaySettings.showTypes.has(annotation.type)) {
        return false;
      }
      
      // Author filter
      if (authorFilter && !authorFilter.includes(annotation.author.id)) {
        return false;
      }
      
      if (overlaySettings.showAuthors.size > 0 && !overlaySettings.showAuthors.has(annotation.author.id)) {
        return false;
      }
      
      // Status filter (only show published annotations)
      if (annotation.status !== 'published') {
        return false;
      }
      
      return true;
    });
  }, [annotations, currentRoute, typeFilter, authorFilter, overlaySettings]);
  
  // Handle double-click to create annotation
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    if (!allowCreation || !currentUser?.permissions.canAnnotate || !currentTarget) {
      return;
    }
    
    // Prevent if clicking on existing annotations or UI elements
    const target = event.target as Element;
    if (target.closest('[data-annotation-id]') || target.closest('[data-no-annotation]')) {
      return;
    }
    
    const position = {
      x: event.clientX,
      y: event.clientY,
    };
    
    setCreatorState({
      isOpen: true,
      position,
      target: currentTarget,
    });
    
    onAnnotationCreate?.(currentTarget, position);
  }, [allowCreation, currentUser, currentTarget, onAnnotationCreate]);
  
  // Set up double-click listener
  useEffect(() => {
    if (allowCreation) {
      document.addEventListener('dblclick', handleDoubleClick);
      return () => document.removeEventListener('dblclick', handleDoubleClick);
    }
  }, [allowCreation, handleDoubleClick]);
  
  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation.id);
    onAnnotationClick?.(annotation);
  }, [onAnnotationClick]);
  
  // Handle annotation creation completion
  const handleAnnotationCreated = useCallback((annotationId: string) => {
    setCreatorState(prev => ({ ...prev, isOpen: false }));
    setSelectedAnnotation(annotationId);
  }, []);
  
  // Handle creator cancel
  const handleCreatorCancel = useCallback(() => {
    setCreatorState(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  // Toggle annotation type visibility
  const toggleAnnotationType = useCallback((type: AnnotationType) => {
    setOverlaySettings(prev => {
      const newShowTypes = new Set(prev.showTypes);
      if (newShowTypes.has(type)) {
        newShowTypes.delete(type);
      } else {
        newShowTypes.add(type);
      }
      return { ...prev, showTypes: newShowTypes };
    });
  }, []);
  
  // Toggle author visibility
  const toggleAuthor = useCallback((authorId: string) => {
    setOverlaySettings(prev => {
      const newShowAuthors = new Set(prev.showAuthors);
      if (newShowAuthors.has(authorId)) {
        newShowAuthors.delete(authorId);
      } else {
        newShowAuthors.add(authorId);
      }
      return { ...prev, showAuthors: newShowAuthors };
    });
  }, []);
  
  // Get unique authors from annotations
  const authors = useMemo(() => {
    const authorMap = new Map();
    Array.from(annotations.values()).forEach(annotation => {
      if (!authorMap.has(annotation.author.id)) {
        authorMap.set(annotation.author.id, annotation.author);
      }
    });
    return Array.from(authorMap.values());
  }, [annotations]);
  
  if (!currentSession || !showAnnotations) {
    return null;
  }
  
  return (
    <div
      className={className}
      data-testid={testId}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: overlaySettings.opacity,
      }}
    >
      {/* Annotation markers */}
      <AnimatePresence>
        {filteredAnnotations.map(annotation => (
          <div 
            key={annotation.id} 
            style={{ pointerEvents: 'auto' }}
          >
            <AnnotationMarker
              annotation={annotation}
              position={annotation.position || { x: 100, y: 100 }}
              isSelected={selectedAnnotation === annotation.id}
              showPreview={showPreviews}
              onClick={handleAnnotationClick}
              data-testid={`annotation-marker-${annotation.id}`}
            />
          </div>
        ))}
      </AnimatePresence>
      
      {/* Annotation creator */}
      <AnimatePresence>
        {creatorState.isOpen && creatorState.target && (
          <div style={{ pointerEvents: 'auto' }}>
            <AnnotationCreator
              target={creatorState.target}
              position={creatorState.position}
              isOpen={creatorState.isOpen}
              onAnnotationCreate={handleAnnotationCreated}
              onCancel={handleCreatorCancel}
              onClose={handleCreatorCancel}
              data-testid="annotation-creator"
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Overlay controls */}
      {allowCreation && currentUser?.permissions.canAnnotate && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          {/* Annotation count */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#374151',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            {filteredAnnotations.length} annotation{filteredAnnotations.length !== 1 ? 's' : ''}
          </motion.div>
          
          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setOverlaySettings(prev => ({ 
                ...prev, 
                opacity: prev.opacity === 1 ? 0.5 : 1 
              }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
              title={overlaySettings.opacity === 1 ? 'Fade annotations' : 'Show annotations fully'}
            >
              {overlaySettings.opacity === 1 ? (
                <IconEye size={18} style={{ color: '#374151' }} />
              ) : (
                <IconEyeOff size={18} style={{ color: '#6B7280' }} />
              )}
            </button>
            
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
              title="Filter annotations"
            >
              <IconFilter size={18} style={{ color: '#374151' }} />
            </button>
          </motion.div>
        </div>
      )}
      
      {/* Creation hint */}
      {allowCreation && currentUser?.permissions.canAnnotate && filteredAnnotations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            color: '#6B7280',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconPlus size={16} />
          Double-click anywhere to create an annotation
        </motion.div>
      )}
    </div>
  );
};