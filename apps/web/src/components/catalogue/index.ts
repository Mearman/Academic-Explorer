/**
 * Catalogue UI components for Academic Explorer
 *
 * This module exports all catalogue-related components for managing lists,
 * bibliographies, and entity collections in the Academic Explorer application.
 */

export { CatalogueListComponent } from "./CatalogueList";
export { CatalogueEntities } from "./CatalogueEntities";
export { CreateListModal } from "./CreateListModal";
export { ShareModal } from "./ShareModal";
export { ImportModal } from "./ImportModal";

// Re-export all catalogue types from utils
export type {
  CatalogueList,
  CatalogueEntity,
  EntityType,
  ListType,
  CatalogueService,
  CompressedListData,
  ShareUrlData,
} from "@academic-explorer/utils";