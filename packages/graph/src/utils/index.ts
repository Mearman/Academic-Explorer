/**
 * Graph utilities exports
 */

export * from "./node-helpers";
export * from "./entity-detection";
export * from "./performance-config";

// Export edge calculations but exclude Position to avoid conflicts
export type {
  NodeBounds,
  AttachmentPoint,
  EdgeAttachment
} from "./edge-calculations";
export {
  calculateClosestAttachment,
  calculateArrowPosition,
  batchCalculateAttachments
} from "./edge-calculations";