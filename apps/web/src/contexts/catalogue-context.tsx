/**
 * Catalogue Context Provider
 * Provides shared catalogue state and operations to child components
 *
 * This context ensures all components within the catalogue feature share
 * the same useCatalogue hook instance, preventing state isolation issues
 * where different components have different selectedList/entities state.
 */

import React, { createContext, useContext, type ReactNode } from "react";
import { useCatalogue, type UseCatalogueReturn } from "@/hooks/useCatalogue";

// Create context with undefined default (will throw if used outside provider)
const CatalogueContext = createContext<UseCatalogueReturn | undefined>(undefined);

interface CatalogueProviderProps {
  children: ReactNode;
}

/**
 * Catalogue Provider Component
 * Wraps catalogue-related components to share a single useCatalogue instance
 */
export function CatalogueProvider({ children }: CatalogueProviderProps) {
  const catalogueState = useCatalogue();

  return (
    <CatalogueContext.Provider value={catalogueState}>
      {children}
    </CatalogueContext.Provider>
  );
}

/**
 * Hook to access catalogue context
 * Must be used within a CatalogueProvider
 */
export function useCatalogueContext(): UseCatalogueReturn {
  const context = useContext(CatalogueContext);

  if (context === undefined) {
    throw new Error("useCatalogueContext must be used within a CatalogueProvider");
  }

  return context;
}
