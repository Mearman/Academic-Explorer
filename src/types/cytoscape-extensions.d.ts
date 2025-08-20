/**
 * Type declarations for Cytoscape.js extensions
 */

declare module 'cytoscape-cose-bilkent' {
  import type { Ext } from 'cytoscape';
  
  const coseBilkent: Ext;
  export = coseBilkent;
}

declare module 'cytoscape-dagre' {
  import type { Ext } from 'cytoscape';
  
  const dagre: Ext;
  export = dagre;
}