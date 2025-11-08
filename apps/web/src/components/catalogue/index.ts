/**
 * Catalogue UI components for Academic Explorer
 *
 * This module exports all catalogue-related components for managing lists,
 * bibliographies, and entity collections in the Academic Explorer application.
 */

export { CatalogueManager } from "./CatalogueManager";
export { CatalogueListComponent } from "./CatalogueList";
export { CatalogueEntities } from "./CatalogueEntities";
export { CreateListModal } from "./CreateListModal";
export { ShareModal } from "./ShareModal";
export { ImportModal } from "./ImportModal";
export { AddToCatalogueButton } from "./AddToCatalogueButton";
export { CatalogueSidebarLink } from "./CatalogueSidebarLink";

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