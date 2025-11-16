import { createLazyFileRoute } from "@tanstack/react-router";
import { CatalogueManager } from "@/components/catalogue/CatalogueManager";
import { CatalogueErrorBoundary } from "@/components/catalogue/CatalogueErrorBoundary";
import { CatalogueProvider } from "@/contexts/catalogue-context";
import { logger } from "@academic-explorer/utils/logger";
import type { CatalogueSearch } from "./catalogue";

// T078: Wrap CatalogueManager in error boundary for graceful error handling
// T082: Wrap in CatalogueProvider to share useCatalogue state between components
function CataloguePage() {
  // T064: Get search params from router
  const search = Route.useSearch() as CatalogueSearch;

  logger.debug("catalogue", "Catalogue page rendering", {
    hasShareData: !!search.data
  });

  return (
    <CatalogueProvider>
      <CatalogueErrorBoundary>
        <div data-testid="catalogue-manager">
          <CatalogueManager shareData={search.data} />
        </div>
      </CatalogueErrorBoundary>
    </CatalogueProvider>
  );
}

export const Route = createLazyFileRoute("/catalogue")({
  component: CataloguePage,
});

export default CataloguePage;