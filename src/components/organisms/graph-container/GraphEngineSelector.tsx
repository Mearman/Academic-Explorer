/**
 * Graph Engine Selector Component
 * 
 * Comprehensive dropdown selector for switching between graph rendering engines.
 * Features engine icons, descriptions, capability indicators, and smart recommendations.
 */

import { clsx } from 'clsx';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useEngineCapabilities } from '../graph-engines/hooks/useEngineCapabilities';
import { useGraphEngine } from '../graph-engines/hooks/useGraphEngine';
import type { GraphEngineType } from '../graph-engines/provider';

import {
  engineSelector,
  selectorButton,
  selectorButtonContent,
  selectorIcon,
  selectorLabel,
  selectorTitle,
  selectorDescription,
  chevronIcon,
  dropdown,
  dropdownOption,
  optionContent,
  optionTitle,
  optionDescription,
  mobileResponsive,
  mobileDropdown,
} from './components.css';
import { EngineCapabilityBadges } from './EngineCapabilityBadges';
import { EngineRecommendationTooltip } from './EngineRecommendationTooltip';


// ============================================================================
// Types & Interfaces
// ============================================================================

export interface GraphEngineSelectorProps {
  /** Current selected engine type */
  selectedEngine?: GraphEngineType;
  
  /** Current selected engine type (alias for compatibility) */
  value?: GraphEngineType;
  
  /** Callback when engine selection changes */
  onEngineChange?: (engineType: GraphEngineType) => void;
  
  /** Callback when engine selection changes (alias for compatibility) */
  onChange?: (engineType: string) => void;
  
  /** Whether to show capability badges for each engine */
  showCapabilities?: boolean;
  
  /** Whether to show smart recommendations */
  showRecommendations?: boolean;
  
  /** Whether to show performance hints */
  showPerformanceHints?: boolean;
  
  /** Current graph size for recommendations */
  graphSize?: {
    vertices: number;
    edges: number;
  };
  
  /** Whether the selector is disabled */
  disabled?: boolean;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Whether to use compact layout */
  compact?: boolean;
  
  /** Placeholder text when no engine selected */
  placeholder?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

interface EngineOption {
  type: GraphEngineType;
  displayName: string;
  description: string;
  icon: string;
  isImplemented: boolean;
  isComingSoon: boolean;
}

// ============================================================================
// Engine Configuration
// ============================================================================

const ENGINE_OPTIONS: EngineOption[] = [
  {
    type: 'canvas-2d',
    displayName: 'Canvas 2D',
    description: 'Lightweight 2D rendering with broad compatibility',
    icon: '🎨',
    isImplemented: true,
    isComingSoon: false,
  },
  {
    type: 'svg',
    displayName: 'SVG',
    description: 'Vector-based rendering with infinite zoom capability',
    icon: '📐',
    isImplemented: true,
    isComingSoon: false,
  },
  {
    type: 'webgl',
    displayName: 'WebGL',
    description: 'Hardware-accelerated rendering for large graphs',
    icon: '⚡',
    isImplemented: false,
    isComingSoon: true,
  },
  {
    type: 'd3-force',
    displayName: 'D3.js Force',
    description: 'Physics-based simulations with custom layouts',
    icon: '🔬',
    isImplemented: true,
    isComingSoon: false,
  },
  {
    type: 'cytoscape',
    displayName: 'Cytoscape.js',
    description: 'Feature-rich network analysis and interaction',
    icon: '🕸️',
    isImplemented: false,
    isComingSoon: true,
  },
  {
    type: 'vis-network',
    displayName: 'vis-network',
    description: 'Interactive network visualization library',
    icon: '🌐',
    isImplemented: false,
    isComingSoon: true,
  },
];

// ============================================================================
// Component Implementation
// ============================================================================

export function GraphEngineSelector({
  selectedEngine,
  onEngineChange,
  showCapabilities = true,
  showRecommendations = true,
  graphSize,
  disabled = false,
  className,
  compact = false,
  placeholder = 'Select an engine',
  'data-testid': testId = 'graph-engine-selector',
}: GraphEngineSelectorProps): React.JSX.Element {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  
  const [isOpen, setIsOpen] = useState(false);
  const [showRecommendationTooltip, setShowRecommendationTooltip] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { getAllCapabilities, recommendEngines } = useEngineCapabilities();
  const { currentEngine, switchEngine } = useGraphEngine();
  
  // Use selectedEngine prop or fall back to current engine from context
  const activeEngine = selectedEngine || currentEngine;
  const selectedOption = ENGINE_OPTIONS.find(option => option.type === activeEngine);
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleToggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);
  
  const handleSelectEngine = useCallback((engineType: GraphEngineType) => {
    const option = ENGINE_OPTIONS.find(opt => opt.type === engineType);
    
    // Only allow selection of implemented engines
    if (!option?.isImplemented) {
      return;
    }
    
    setIsOpen(false);
    onEngineChange?.(engineType);
    
    // If no external handler provided, use context
    if (!onEngineChange) {
      switchEngine(engineType);
    }
  }, [onEngineChange, switchEngine]);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case 'Space':
        event.preventDefault();
        handleToggleDropdown();
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  }, [disabled, isOpen, handleToggleDropdown]);
  
  const handleOptionKeyDown = useCallback((event: React.KeyboardEvent, engineType: GraphEngineType) => {
    switch (event.key) {
      case 'Enter':
      case 'Space':
        event.preventDefault();
        handleSelectEngine(engineType);
        break;
    }
  }, [handleSelectEngine]);
  
  // ============================================================================
  // Click Outside Handler
  // ============================================================================
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowRecommendationTooltip(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // ============================================================================
  // Recommendations
  // ============================================================================
  
  const recommendations = React.useMemo(() => {
    if (!showRecommendations || !graphSize) return [];
    
    return recommendEngines({
      performance: {
        minVertices: graphSize.vertices,
        minEdges: graphSize.edges,
      },
      graphSize: {
        maxVertices: graphSize.vertices,
        maxEdges: graphSize.edges,
      },
    }).slice(0, 3); // Top 3 recommendations
  }, [showRecommendations, graphSize, recommendEngines]);
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const renderEngineOption = (option: EngineOption) => {
    const capabilities = getAllCapabilities().find(cap => cap.engineType === option.type)?.capabilities;
    const isSelected = option.type === activeEngine;
    
    return (
      <div
        key={option.type}
        className={dropdownOption({
          selected: isSelected,
          disabled: !option.isImplemented,
          comingSoon: option.isComingSoon,
        })}
        role="option"
        aria-selected={isSelected}
        tabIndex={option.isImplemented ? 0 : -1}
        onClick={() => handleSelectEngine(option.type)}
        onKeyDown={(e) => handleOptionKeyDown(e, option.type)}
        data-testid={`engine-option-${option.type}`}
      >
        <div className={selectorIcon} aria-hidden="true">
          {option.icon}
        </div>
        
        <div className={optionContent}>
          <div className={optionTitle}>
            {option.displayName}
          </div>
          
          <div className={optionDescription}>
            {option.description}
          </div>
          
          {showCapabilities && capabilities && !compact && (
            <EngineCapabilityBadges
              capabilities={capabilities}
              compact={true}
              maxBadges={4}
            />
          )}
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div
      ref={selectorRef}
      className={clsx(engineSelector, mobileResponsive, className)}
      data-testid={testId}
    >
      {/* Selector Button */}
      <button
        className={selectorButton({ open: isOpen, disabled })}
        onClick={handleToggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedOption ? `Current engine: ${selectedOption.displayName}` : 'Select graph engine'}
        data-testid={`${testId}-button`}
      >
        <div className={selectorButtonContent}>
          {selectedOption ? (
            <>
              <div className={selectorIcon} aria-hidden="true">
                {selectedOption.icon}
              </div>
              
              <div className={selectorLabel}>
                <div className={selectorTitle}>
                  {selectedOption.displayName}
                </div>
                
                {!compact && (
                  <div className={selectorDescription}>
                    {selectedOption.description}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={selectorTitle}>
              {placeholder}
            </div>
          )}
        </div>
        
        <svg
          className={chevronIcon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={clsx(dropdown, mobileDropdown)}
          role="listbox"
          aria-label="Graph engine options"
          data-testid={`${testId}-dropdown`}
        >
          {ENGINE_OPTIONS.map(renderEngineOption)}
        </div>
      )}
      
      {/* Recommendation Tooltip */}
      {showRecommendations && recommendations.length > 0 && showRecommendationTooltip && (
        <EngineRecommendationTooltip
          recommendations={recommendations}
          onEngineSelect={handleSelectEngine}
          onClose={() => setShowRecommendationTooltip(false)}
          data-testid={`${testId}-recommendations`}
        />
      )}
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

GraphEngineSelector.displayName = 'GraphEngineSelector';

export default GraphEngineSelector;