/**
 * Example demonstrating the updated graph engine registry system
 * 
 * Shows how D3 Force and Cytoscape engines are now available for use
 * in the engine selection system.
 */

import React, { useCallback, useState } from 'react';

import {
  GraphEngineProvider,
  useGraphEngine,
  ENGINE_DISPLAY_NAMES,
  ENGINE_RECOMMENDATIONS,
  getAvailableEngineTypes,
  isEngineImplemented,
  createEngineByType,
} from '../components/organisms/graph-engines';

// ============================================================================
// Engine Selection Demo
// ============================================================================

function EngineSelectionDemo() {
  const { 
    currentEngine,
    switchEngine,
    isTransitioning,
    transitionProgress
  } = useGraphEngine();

  const [engineInfo, setEngineInfo] = useState<any>(null);

  const handleEngineSwitch = useCallback(async (engineType: string) => {
    try {
      await switchEngine(engineType as any);
      
      // Create engine instance to show info
      const engine = await createEngineByType(engineType as any);
      setEngineInfo(engine);
    } catch (error) {
      console.error('Failed to switch engine:', error);
    }
  }, [switchEngine]);

  const availableTypes = getAvailableEngineTypes();

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2>Graph Engine Registry Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Engines</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
          {availableTypes.map(engineType => (
            <div
              key={engineType}
              style={{
                padding: '10px',
                border: currentEngine === engineType ? '2px solid #007bff' : '1px solid #ccc',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: currentEngine === engineType ? '#f8f9fa' : 'white'
              }}
              onClick={() => handleEngineSwitch(engineType)}
            >
              <div style={{ fontWeight: 'bold', color: '#007bff' }}>
                {ENGINE_DISPLAY_NAMES[engineType]}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                Status: {isEngineImplemented(engineType) ? 'Implemented' : 'Placeholder'}
              </div>
              <div style={{ fontSize: '0.8em', color: '#999', marginTop: '4px' }}>
                ID: {engineType}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isTransitioning && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <div>Switching engines... {Math.round(transitionProgress)}%</div>
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#ccc',
            borderRadius: '2px',
            marginTop: '8px'
          }}>
            <div style={{
              width: `${transitionProgress}%`,
              height: '100%',
              backgroundColor: '#007bff',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }}></div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Engine: {ENGINE_DISPLAY_NAMES[currentEngine]}</h3>
        {engineInfo && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            <div><strong>Name:</strong> {engineInfo.name}</div>
            <div><strong>ID:</strong> {engineInfo.id}</div>
            <div><strong>Version:</strong> {engineInfo.version}</div>
            <div><strong>Description:</strong> {engineInfo.description}</div>
            <div><strong>Implemented:</strong> {engineInfo.isImplemented ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Engine Recommendations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(ENGINE_RECOMMENDATIONS).map(([useCase, engines]) => (
            <div 
              key={useCase}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {useCase.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.9em' }}>
                {engines.map(engine => ENGINE_DISPLAY_NAMES[engine]).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3>Registry Information</h3>
        <div>Total available engines: {availableTypes.length}</div>
        <div>Implemented engines: {availableTypes.filter(isEngineImplemented).length}</div>
        <div>Default engine: d3-force (D3 Force Simulation)</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Example Component
// ============================================================================

export function GraphEngineRegistryExample() {
  return (
    <GraphEngineProvider preloadDefault>
      <EngineSelectionDemo />
    </GraphEngineProvider>
  );
}