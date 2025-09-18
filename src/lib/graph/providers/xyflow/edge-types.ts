/**
 * Edge types configuration for XYFlow React Flow
 */

import SmartEdge from "./SmartEdge";
import DynamicFloatingEdge from "./DynamicFloatingEdge";

export const edgeTypes = {
	smart: DynamicFloatingEdge, // Use dynamic edge that recalculates during layout
	smartLegacy: SmartEdge, // Keep legacy edge for fallback
};