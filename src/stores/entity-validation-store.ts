/**
 * Entity Validation Store
 * 
 * Zustand store for managing entity validation state, including validation results,
 * settings, logs, and export functionality. Works alongside the entity graph store
 * to provide comprehensive validation tracking.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationIssue,
  EntityValidationResult,
  BatchValidationResult,
  ValidationLogEntry,
  ValidationFilter,
  ValidationExportConfig,
  ValidationSettings,
  ValidationStatistics,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  DEFAULT_VALIDATION_SETTINGS,
} from '@/types/entity-validation';

interface ValidateEntityParams {
  entityId: string;
  entityType: EntityType;
  entityData: unknown;
  entityDisplayName?: string;
}

interface ValidateBatchEntity {
  id: string;
  type: EntityType;
  data: unknown;
  displayName?: string;
}

interface AddLogEntryParams {
  batchResult: BatchValidationResult;
  metadata?: Partial<ValidationLogEntry['metadata']>;
}

interface EntityValidationState {
  // Core validation data
  validationResults: Map<string, EntityValidationResult>;
  validationLogs: ValidationLogEntry[];
  validationSettings: ValidationSettings;
  
  // UI state
  isValidating: boolean;
  selectedLogEntry: string | null;
  filterOptions: ValidationFilter;
  
  // Statistics cache
  statisticsCache: ValidationStatistics | null;
  statisticsCacheTime: number | null;
  
  // Actions - Validation operations
  validateEntity: (params: ValidateEntityParams) => Promise<EntityValidationResult>;
  validateBatch: (entities: ValidateBatchEntity[]) => Promise<BatchValidationResult>;
  clearValidationResult: (entityId: string) => void;
  clearAllValidationResults: () => void;
  
  // Actions - Log management
  addLogEntry: (params: AddLogEntryParams) => void;
  removeLogEntry: (logEntryId: string) => void;
  clearValidationLogs: () => void;
  selectLogEntry: (logEntryId: string | null) => void;
  
  // Actions - Settings
  updateValidationSettings: (settings: Partial<ValidationSettings>) => void;
  resetValidationSettings: () => void;
  
  // Actions - Filtering
  updateFilter: (filter: Partial<ValidationFilter>) => void;
  resetFilter: () => void;
  
  // Actions - Export
  exportValidationData: (config: ValidationExportConfig) => Promise<string>;
  
  // Computed data - Queries
  getValidationResult: (entityId: string) => EntityValidationResult | null;
  getValidationIssues: (filter?: ValidationFilter) => ValidationIssue[];
  getValidationStatistics: () => ValidationStatistics;
  getLogEntry: (logEntryId: string) => ValidationLogEntry | null;
  
  // Computed data - Summaries
  getValidationSummary: () => {
    totalEntitiesValidated: number;
    entitiesWithIssues: number;
    totalIssues: number;
    issuesBySeverity: Record<ValidationSeverity, number>;
    issuesByType: Record<ValidationIssueType, number>;
  };
  
  // Utility functions
  hasValidationIssues: (entityId: string) => boolean;
  getEntityIssueCount: (entityId: string) => number;
  getEntityHighestSeverity: (entityId: string) => ValidationSeverity | null;
}

// Default filter options
const defaultFilter: ValidationFilter = {
  // Optional properties omitted - they default to undefined
  limit: 100,
  offset: 0,
};

export const useEntityValidationStore = create<EntityValidationState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      validationResults: new Map(),
      validationLogs: [],
      validationSettings: DEFAULT_VALIDATION_SETTINGS,
      isValidating: false,
      selectedLogEntry: null,
      filterOptions: defaultFilter,
      statisticsCache: null,
      statisticsCacheTime: null,
      
      // Validation operations
      validateEntity: async ({ entityId, entityType, entityData, entityDisplayName }) => {
        const { validateEntityData } = await import('@/lib/openalex/utils/entity-validator');
        
        set((state) => {
          state.isValidating = true;
        });
        
        try {
          const result = await validateEntityData(entityId, entityType, entityData, entityDisplayName);
          
          set((state) => {
            state.validationResults.set(entityId, result);
            state.isValidating = false;
            // Invalidate statistics cache
            state.statisticsCache = null;
            state.statisticsCacheTime = null;
          });
          
          return result;
        } catch (error) {
          set((state) => {
            state.isValidating = false;
          });
          throw error;
        }
      },
      
      validateBatch: async (entities) => {
        const { validateEntitiesBatch } = await import('@/lib/openalex/utils/entity-validator');
        
        set((state) => {
          state.isValidating = true;
        });
        
        try {
          const batchResult = await validateEntitiesBatch(entities);
          
          set((state) => {
            // Store individual results
            for (const result of batchResult.results) {
              state.validationResults.set(result.entityId, result);
            }
            state.isValidating = false;
            // Invalidate statistics cache
            state.statisticsCache = null;
            state.statisticsCacheTime = null;
          });
          
          return batchResult;
        } catch (error) {
          set((state) => {
            state.isValidating = false;
          });
          throw error;
        }
      },
      
      clearValidationResult: (entityId) =>
        set((state) => {
          state.validationResults.delete(entityId);
          // Invalidate statistics cache
          state.statisticsCache = null;
          state.statisticsCacheTime = null;
        }),
        
      clearAllValidationResults: () =>
        set((state) => {
          state.validationResults.clear();
          // Invalidate statistics cache
          state.statisticsCache = null;
          state.statisticsCacheTime = null;
        }),
      
      // Log management
      addLogEntry: ({ batchResult, metadata = {} }) =>
        set((state) => {
          const logEntry: ValidationLogEntry = {
            id: `log_${batchResult.batchId}`,
            batchResult,
            metadata: {
              source: 'manual',
              ...metadata,
            },
          };
          
          // Add to beginning, maintain max entries limit
          state.validationLogs = [logEntry, ...state.validationLogs].slice(0, state.validationSettings.maxLogEntries);
        }),
        
      removeLogEntry: (logEntryId) =>
        set((state) => {
          state.validationLogs = state.validationLogs.filter(entry => entry.id !== logEntryId);
          if (state.selectedLogEntry === logEntryId) {
            state.selectedLogEntry = null;
          }
        }),
        
      clearValidationLogs: () =>
        set((state) => {
          state.validationLogs = [];
          state.selectedLogEntry = null;
        }),
        
      selectLogEntry: (logEntryId) =>
        set((state) => {
          state.selectedLogEntry = logEntryId;
        }),
      
      // Settings management
      updateValidationSettings: (settings) =>
        set((state) => {
          Object.assign(state.validationSettings, settings);
        }),
        
      resetValidationSettings: () =>
        set((state) => {
          state.validationSettings = { ...DEFAULT_VALIDATION_SETTINGS };
        }),
      
      // Filter management
      updateFilter: (filter) =>
        set((state) => {
          Object.assign(state.filterOptions, filter);
        }),
        
      resetFilter: () =>
        set((state) => {
          state.filterOptions = { ...defaultFilter };
        }),
      
      // Export functionality
      exportValidationData: async (config) => {
        const { exportValidationData } = await import('@/lib/openalex/utils/validation-exporter');
        const state = get();
        
        // Get filtered issues
        const issues = state.getValidationIssues(config.filters);
        
        // Get validation results for context
        const results = Array.from(state.validationResults.values());
        
        return exportValidationData(issues, results, config);
      },
      
      // Query functions
      getValidationResult: (entityId) => {
        const state = get();
        return state.validationResults.get(entityId) || null;
      },
      
      getValidationIssues: (filter = {}) => {
        const state = get();
        let allIssues: ValidationIssue[] = [];
        
        // Collect all issues from validation results
        for (const result of state.validationResults.values()) {
          allIssues.push(...result.issues);
        }
        
        // Apply filters
        if (filter.entityTypes?.length) {
          allIssues = allIssues.filter(issue => filter.entityTypes!.includes(issue.entityType));
        }
        
        if (filter.issueTypes?.length) {
          allIssues = allIssues.filter(issue => filter.issueTypes!.includes(issue.issueType));
        }
        
        if (filter.severities?.length) {
          allIssues = allIssues.filter(issue => filter.severities!.includes(issue.severity));
        }
        
        if (filter.entityIds?.length) {
          allIssues = allIssues.filter(issue => filter.entityIds!.includes(issue.entityId));
        }
        
        if (filter.fieldPaths?.length) {
          allIssues = allIssues.filter(issue => 
            filter.fieldPaths!.some(path => issue.fieldPath.includes(path))
          );
        }
        
        if (filter.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          allIssues = allIssues.filter(issue =>
            issue.description.toLowerCase().includes(searchLower) ||
            issue.fieldPath.toLowerCase().includes(searchLower) ||
            issue.entityDisplayName?.toLowerCase().includes(searchLower)
          );
        }
        
        if (filter.dateRange) {
          const fromTime = new Date(filter.dateRange.from).getTime();
          const toTime = new Date(filter.dateRange.to).getTime();
          allIssues = allIssues.filter(issue => {
            const issueTime = new Date(issue.timestamp).getTime();
            return issueTime >= fromTime && issueTime <= toTime;
          });
        }
        
        // Apply pagination
        const offset = filter.offset || 0;
        const limit = filter.limit || 100;
        
        return allIssues.slice(offset, offset + limit);
      },
      
      getValidationStatistics: () => {
        const state = get();
        const now = Date.now();
        
        // Return cached statistics if recent (within 5 minutes)
        if (state.statisticsCache && state.statisticsCacheTime && (now - state.statisticsCacheTime) < 300000) {
          return state.statisticsCache;
        }
        
        // Calculate fresh statistics
        const allResults = Array.from(state.validationResults.values());
        const allIssues = allResults.flatMap(result => result.issues);
        
        // Issue type counts
        const issueTypeCounts: Record<ValidationIssueType, number> = {
          [ValidationIssueType.MISSING_FIELD]: 0,
          [ValidationIssueType.EXTRA_FIELD]: 0,
          [ValidationIssueType.TYPE_MISMATCH]: 0,
          [ValidationIssueType.INVALID_FORMAT]: 0,
          [ValidationIssueType.VALUE_OUT_OF_RANGE]: 0,
        };
        
        // Entity type issue counts
        const entityTypeIssueCounts: Partial<Record<EntityType, { errorCount: number; warningCount: number; totalCount: number }>> = {};
        
        for (const issue of allIssues) {
          issueTypeCounts[issue.issueType]++;
          
          if (!entityTypeIssueCounts[issue.entityType]) {
            entityTypeIssueCounts[issue.entityType] = { errorCount: 0, warningCount: 0, totalCount: 0 };
          }
          
          const entityTypeCount = entityTypeIssueCounts[issue.entityType];
          if (entityTypeCount) {
            entityTypeCount.totalCount++;
            if (issue.severity === ValidationSeverity.ERROR) {
              entityTypeCount.errorCount++;
            } else if (issue.severity === ValidationSeverity.WARNING) {
              entityTypeCount.warningCount++;
            }
          }
        }
        
        // Calculate common issue types for reuse
        const commonIssueTypes = Object.entries(issueTypeCounts)
          .map(([type, count]) => ({
            issueType: type as ValidationIssueType,
            count,
            percentage: allIssues.length > 0 ? (count / allIssues.length) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count);

        // Calculate derived metrics
        const entitiesWithoutIssues = allResults.filter(r => r.issues.length === 0).length;
        const averageIssuesPerEntity = allResults.length > 0 ? allIssues.length / allResults.length : 0;
        const validationSuccessRate = allResults.length > 0 ? (entitiesWithoutIssues / allResults.length) * 100 : 0;
        const mostCommonIssueType = commonIssueTypes.length > 0 && commonIssueTypes[0]
          ? commonIssueTypes[0].issueType
          : ValidationIssueType.MISSING_FIELD; // Default fallback

        const statistics: ValidationStatistics = {
          totalValidationRuns: state.validationLogs.length,
          totalEntitiesValidated: allResults.length,
          totalIssuesFound: allIssues.length,
          averageIssuesPerEntity,
          validationSuccessRate,
          mostCommonIssueType,
          commonIssueTypes,
          problematicEntityTypes: Object.entries(entityTypeIssueCounts)
            .map(([type, counts]) => ({
              entityType: type as EntityType,
              ...counts,
            }))
            .sort((a, b) => b.totalCount - a.totalCount),
          trends: [], // TODO: Implement trend calculation
          recentActivity: allResults
            .sort((a, b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime())
            .slice(0, 10)
            .map(result => ({
              timestamp: result.validatedAt,
              entityId: result.entityId,
              entityType: result.entityType,
              issueCount: result.issues.length,
              severity: result.issues.length > 0 
                ? result.issues.reduce((max: ValidationSeverity, issue) => {
                    if (issue.severity === ValidationSeverity.ERROR) return ValidationSeverity.ERROR;
                    if (issue.severity === ValidationSeverity.WARNING && max !== ValidationSeverity.ERROR) return ValidationSeverity.WARNING;
                    return max;
                  }, ValidationSeverity.INFO as ValidationSeverity)
                : ValidationSeverity.INFO,
            })),
        };
        
        // Cache the statistics
        set((state) => {
          state.statisticsCache = statistics;
          state.statisticsCacheTime = now;
        });
        
        return statistics;
      },
      
      getLogEntry: (logEntryId) => {
        const state = get();
        return state.validationLogs.find(entry => entry.id === logEntryId) || null;
      },
      
      // Summary functions
      getValidationSummary: () => {
        const state = get();
        const allResults = Array.from(state.validationResults.values());
        const allIssues = allResults.flatMap(result => result.issues);
        
        const issuesBySeverity: Record<ValidationSeverity, number> = {
          [ValidationSeverity.ERROR]: 0,
          [ValidationSeverity.WARNING]: 0,
          [ValidationSeverity.INFO]: 0,
        };
        
        const issuesByType: Record<ValidationIssueType, number> = {
          [ValidationIssueType.MISSING_FIELD]: 0,
          [ValidationIssueType.EXTRA_FIELD]: 0,
          [ValidationIssueType.TYPE_MISMATCH]: 0,
          [ValidationIssueType.INVALID_FORMAT]: 0,
          [ValidationIssueType.VALUE_OUT_OF_RANGE]: 0,
        };
        
        for (const issue of allIssues) {
          issuesBySeverity[issue.severity]++;
          issuesByType[issue.issueType]++;
        }
        
        return {
          totalEntitiesValidated: allResults.length,
          entitiesWithIssues: allResults.filter(r => r.issues.length > 0).length,
          totalIssues: allIssues.length,
          issuesBySeverity,
          issuesByType,
        };
      },
      
      // Utility functions
      hasValidationIssues: (entityId) => {
        const state = get();
        const result = state.validationResults.get(entityId);
        return result ? result.issues.length > 0 : false;
      },
      
      getEntityIssueCount: (entityId) => {
        const state = get();
        const result = state.validationResults.get(entityId);
        return result ? result.issues.length : 0;
      },
      
      getEntityHighestSeverity: (entityId) => {
        const state = get();
        const result = state.validationResults.get(entityId);
        if (!result || result.issues.length === 0) return null;
        
        if (result.issues.some(i => i.severity === ValidationSeverity.ERROR)) {
          return ValidationSeverity.ERROR;
        }
        if (result.issues.some(i => i.severity === ValidationSeverity.WARNING)) {
          return ValidationSeverity.WARNING;
        }
        return ValidationSeverity.INFO;
      },
    })),
    {
      name: 'academic-explorer-validation-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        validationLogs: state.validationLogs,
        validationSettings: state.validationSettings,
        // Don't persist validation results as they may become stale
      }),
    }
  )
);