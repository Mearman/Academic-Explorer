/**
 * Graph Engine Demo Component
 * 
 * Demonstrates the fully decoupled graph rendering system with runtime engine switching.
 * This example shows how to use the new graph engine architecture in Academic Explorer.
 * 
 * NOTE: Currently disabled due to interface mismatches - needs updating to work with current hook interfaces
 */

import React from 'react';

// TODO: Fix these imports once interfaces are aligned
// import {
//   UniversalGraphContainer,
//   GraphEngineSelector,
//   EngineCapabilityBadges,
//   EnginePerformanceIndicator,
//   EngineComparisonModal,
//   EngineConfigPanel
// } from '@/components';
// import { GraphEngineProvider, useGraphEngine, useEngineCapabilities } from '../../graph-engines';
// import type { EntityGraphVertex } from '@/types/entity-graph';

// import * as styles from './GraphEngineDemo.css';

/**
 * Main demo component showing the decoupled graph system
 * 
 * TODO: Re-implement with correct interfaces once hook return types are fixed
 */
export function GraphEngineDemo() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed #ccc', borderRadius: '8px' }}>
      <h2>Graph Engine Demo</h2>
      <p>
        <strong>Currently Disabled</strong>
      </p>
      <p>
        This demo component needs to be updated to work with the current graph engine interfaces.
        The hook return types have changed and some components may have different prop signatures.
      </p>
      <details style={{ marginTop: '16px', textAlign: 'left' }}>
        <summary>Issues to fix:</summary>
        <ul>
          <li><code>getEngineById</code> and <code>performanceMetrics</code> properties may be missing from hook return</li>
          <li><code>GraphEngineType</code> string assignment compatibility</li>
          <li>Component prop interfaces need validation</li>
          <li>Import paths for graph engine components need verification</li>
        </ul>
      </details>
    </div>
  );
}

// TODO: Re-implement when interfaces are fixed
// function GraphEngineDemoContent() {
//   const [showComparison, setShowComparison] = useState(false);
//   const [showConfig, setShowConfig] = useState(false);
//   
//   const { 
//     currentEngine, 
//     switchEngine, 
//     switchToOptimalEngine,
//     getEngineById,
//     isTransitioning,
//     performanceMetrics
//   } = useGraphEngine();

//   const { 
//     supportedEngines,
//     getEngineRecommendation,
//     compareEngines
//   } = useEngineCapabilities();

//   const handleVertexClick = (vertex: EntityGraphVertex) => {
//     console.log('Vertex clicked:', vertex.displayName);
//   };

//   const handleEngineSwitch = (engineId: string) => {
//     console.log(`Switching to engine: ${engineId}`);
//     switchEngine(engineId);
//   };

//   const handleOptimalSwitch = () => {
//     console.log('Switching to optimal engine for current graph');
//     switchToOptimalEngine();
//   };

//   const currentEngineInfo = getEngineById(currentEngine);
//   const recommendation = getEngineRecommendation();

//   return (
//     <div className={styles.demoContent}>
//       {/* Header */}
//       <div className={styles.header}>
//         <h2>Graph Engine Demo - Academic Explorer</h2>
//         <p>Demonstration of the fully decoupled graph rendering system with runtime engine switching</p>
//       </div>

//       {/* Engine Controls */}
//       <div className={styles.controls}>
//         <div className={styles.controlGroup}>
//           <label>Select Graph Engine:</label>
//           <GraphEngineSelector
//             value={currentEngine}
//             onChange={handleEngineSwitch}
//             showCapabilities={true}
//             showPerformanceHints={true}
//           />
//         </div>

//         <div className={styles.controlGroup}>
//           <button 
//             onClick={handleOptimalSwitch}
//             className={styles.button}
//             disabled={isTransitioning}
//           >
//             Auto-Optimize Engine
//           </button>
          
//           <button 
//             onClick={() => setShowComparison(true)}
//             className={styles.button}
//           >
//             Compare Engines
//           </button>
          
//           <button 
//             onClick={() => setShowConfig(true)}
//             className={styles.button}
//           >
//             Configure Engine
//           </button>
//         </div>
//       </div>

//       {/* Current Engine Info */}
//       <div className={styles.engineInfo}>
//         <div className={styles.infoSection}>
//           <h3>Current Engine: {currentEngineInfo?.name}</h3>
//           <p>{currentEngineInfo?.description}</p>
          
//           {currentEngineInfo && (
//             <EngineCapabilityBadges 
//               capabilities={currentEngineInfo.capabilities}
//               compact={false}
//             />
//           )}
//         </div>

//         <div className={styles.infoSection}>
//           <h3>Performance</h3>
//           <EnginePerformanceIndicator 
//             autoHide={false}
//             showHistory={true}
//             position="inline"
//           />
//         </div>

//         {recommendation && (
//           <div className={styles.infoSection}>
//             <h3>Recommendation</h3>
//             <p>
//               For your current graph size, we recommend: 
//               <strong> {recommendation.engine}</strong>
//             </p>
//             <p className={styles.recommendationReason}>
//               {recommendation.reason}
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Graph Container */}
//       <div className={styles.graphSection}>
//         <h3>Interactive Graph</h3>
//         <UniversalGraphContainer
//           width={1000}
//           height={600}
//           onVertexClick={handleVertexClick}
//           showControls={true}
//           showLegend={true}
//           className={styles.graphContainer}
//         />
//       </div>

//       {/* Feature Demo */}
//       <div className={styles.features}>
//         <h3>Key Features Demonstrated</h3>
//         <ul>
//           <li>✅ <strong>Runtime Engine Switching</strong> - Switch between rendering engines without losing data</li>
//           <li>✅ <strong>Performance Monitoring</strong> - Real-time FPS and memory tracking</li>
//           <li>✅ <strong>Smart Recommendations</strong> - Automatic engine selection based on graph characteristics</li>
//           <li>✅ <strong>Capability Detection</strong> - Visual indicators of engine features and limitations</li>
//           <li>✅ <strong>Smooth Transitions</strong> - Animated engine switches with data preservation</li>
//           <li>✅ <strong>Configuration Management</strong> - Engine-specific settings and optimization</li>
//           <li>✅ <strong>Fallback Mechanisms</strong> - Graceful handling of unsupported engines</li>
//         </ul>
//       </div>

//       {/* Supported Engines List */}
//       <div className={styles.enginesGrid}>
//         <h3>Available Engines ({supportedEngines.length})</h3>
//         <div className={styles.engineCards}>
//           {supportedEngines.map((engine: any) => (
//             <div 
//               key={engine.id} 
//               className={`${styles.engineCard} ${currentEngine === engine.id ? styles.active : ''}`}
//             >
//               <h4>{engine.name}</h4>
//               <p>{engine.description}</p>
//               <EngineCapabilityBadges 
//                 capabilities={engine.capabilities}
//                 compact={true}
//               />
//               <button 
//                 onClick={() => handleEngineSwitch(engine.id)}
//                 disabled={currentEngine === engine.id || isTransitioning}
//                 className={styles.switchButton}
//               >
//                 {currentEngine === engine.id ? 'Current' : 'Switch'}
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Modals */}
//       {showComparison && (
//         <EngineComparisonModal
//           isOpen={showComparison}
//           onClose={() => setShowComparison(false)}
//           onEngineSelect={handleEngineSwitch}
//           currentEngine={currentEngine}
//         />
//       )}

//       {showConfig && (
//         <div className={styles.configModal}>
//           <div className={styles.configContent}>
//             <div className={styles.configHeader}>
//               <h3>Engine Configuration</h3>
//               <button 
//                 onClick={() => setShowConfig(false)}
//                 className={styles.closeButton}
//               >
//                 ×
//               </button>
//             </div>
//             <EngineConfigPanel
//               compact={false}
//               showAdvanced={true}
//               showPreview={true}
//               collapsible={true}
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// Export for use in examples
// Named export only - no default export