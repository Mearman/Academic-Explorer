import { createLazyFileRoute } from "@tanstack/react-router";
import { CatalogueManager } from "@/components/catalogue/CatalogueManager";
import { logger } from "@academic-explorer/utils/logger";
import type { CatalogueSearch } from "./catalogue";

function CataloguePage() {
  // T064: Get search params from router
  const search = Route.useSearch() as CatalogueSearch;

  logger.debug("catalogue", "Catalogue page rendering", {
    hasShareData: !!search.data
  });

  return (
    <div data-testid="catalogue-manager">
      <CatalogueManager shareData={search.data} />
    </div>
  );
}

export const Route = createLazyFileRoute("/catalogue")({
  component: CataloguePage,
});

export default CataloguePage;