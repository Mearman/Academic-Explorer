/**
 * Zustand store for entity comparison functionality
 * Manages comparison state, entity selection, and view configuration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { EntityData } from '@/hooks/use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

/**
 * Supported comparison view types
 */
export type ComparisonView = 'overview' | 'metrics' | 'timeline' | 'relationships';

/**
 * Entity wrapper for comparison with metadata
 */
export interface ComparisonEntity {
  /** The actual entity data */
  data: EntityData;
  /** Entity type for consistent comparison */
  type: EntityType;
  /** Normalized entity ID for quick lookup */
  id: string;
  /** Timestamp when entity was added to comparison */
  addedAt: number;
}

/**
 * Comparison store state interface
 */
interface AddEntityParams {
  entity: EntityData;
  type: EntityType;
}

interface CanAddEntityParams {
  entity: EntityData;
  type: EntityType;
}

export interface ComparisonState {
  /** Array of entities being compared */
  entities: ComparisonEntity[];
  /** Type of entities being compared (all must be same type) */
  comparisonType: EntityType | null;
  /** Currently active comparison view */
  activeView: ComparisonView;
  /** Whether comparison mode is active (2+ entities) */
  isComparing: boolean;
  /** Maximum number of entities that can be compared */
  maxEntities: number;

  // Actions
  /** Add an entity to the comparison */
  addEntity: (params: AddEntityParams) => void;
  /** Remove an entity from comparison by ID */
  removeEntity: (entityId: string) => void;
  /** Clear all entities from comparison */
  clearComparison: () => void;
  /** Set the active comparison view */
  setActiveView: (view: ComparisonView) => void;
  
  // Utility functions
  /** Check if an entity can be added to comparison */
  canAddEntity: (params: CanAddEntityParams) => boolean;
  /** Check if entity is already in comparison */
  hasEntity: (entityId: string) => boolean;
  /** Get entities of specific type */
  getEntitiesByType: (type: EntityType) => ComparisonEntity[];
}

/**
 * Extract clean entity ID from OpenAlex entity
 */
function extractEntityId(entity: EntityData): string {
  if (!entity.id) return '';
  
  // Extract just the ID part from full URLs
  const idMatch = entity.id.match(/([AWSIPTFC]\d+)$/);
  return idMatch ? idMatch[1] : entity.id;
}

/**
 * Validate entity data for comparison
 */
function isValidEntity(entity: EntityData): boolean {
  return Boolean(
    entity &&
    typeof entity === 'object' &&
    entity.id &&
    entity.display_name
  );
}

/**
 * Create comparison store with Zustand + Immer + persistence
 */
export const useComparisonStore = create<ComparisonState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      entities: [],
      comparisonType: null,
      activeView: 'overview',
      isComparing: false,
      maxEntities: 5,

      // Actions
      addEntity: ({ entity, type }) => {
        const state = get();
        
        // Validate entity
        if (!isValidEntity(entity)) {
          console.warn('[ComparisonStore] Invalid entity data:', entity);
          return;
        }

        const entityId = extractEntityId(entity);
        if (!entityId) {
          console.warn('[ComparisonStore] Could not extract entity ID:', entity);
          return;
        }

        // Check if can add entity
        if (!state.canAddEntity({ entity, type })) {
          console.warn('[ComparisonStore] Cannot add entity:', {
            entity: entityId,
            type,
            reason: state.entities.length >= state.maxEntities 
              ? 'max_entities_reached'
              : state.comparisonType && state.comparisonType !== type
                ? 'type_mismatch'
                : state.hasEntity(entityId)
                  ? 'duplicate_entity'
                  : 'unknown'
          });
          return;
        }

        set((state) => {
          // Set comparison type if this is the first entity
          if (state.entities.length === 0) {
            state.comparisonType = type;
          }

          // Add entity to comparison
          state.entities.push({
            data: entity,
            type,
            id: entityId,
            addedAt: Date.now()
          });

          // Update comparison status
          state.isComparing = state.entities.length >= 2;
        });
      },

      removeEntity: (entityId) => {
        set((state) => {
          // Remove entity by ID
          state.entities = state.entities.filter(e => e.id !== entityId);

          // Reset comparison type if no entities left
          if (state.entities.length === 0) {
            state.comparisonType = null;
            state.activeView = 'overview';
          }

          // Update comparison status
          state.isComparing = state.entities.length >= 2;
        });
      },

      clearComparison: () => {
        set((state) => {
          state.entities = [];
          state.comparisonType = null;
          state.activeView = 'overview';
          state.isComparing = false;
        });
      },

      setActiveView: (view) => {
        // Only accept valid view types
        const validViews: ComparisonView[] = ['overview', 'metrics', 'timeline', 'relationships'];
        if (!validViews.includes(view)) {
          console.warn('[ComparisonStore] Invalid view type:', view);
          return;
        }

        set((state) => {
          state.activeView = view;
        });
      },

      // Utility functions
      canAddEntity: ({ entity, type }) => {
        const state = get();
        
        // Check if at max capacity
        if (state.entities.length >= state.maxEntities) {
          return false;
        }

        // Check if entity is valid
        if (!isValidEntity(entity)) {
          return false;
        }

        const entityId = extractEntityId(entity);
        if (!entityId) {
          return false;
        }

        // Check for duplicate
        if (state.hasEntity(entityId)) {
          return false;
        }

        // Check type compatibility (if comparison type is set)
        if (state.comparisonType && state.comparisonType !== type) {
          return false;
        }

        return true;
      },

      hasEntity: (entityId) => {
        const state = get();
        return state.entities.some(e => e.id === entityId);
      },

      getEntitiesByType: (type) => {
        const state = get();
        return state.entities.filter(e => e.type === type);
      }
    })),
    {
      name: 'academic-explorer-comparison',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entities: state.entities,
        comparisonType: state.comparisonType,
        activeView: state.activeView
      }),
    }
  )
);