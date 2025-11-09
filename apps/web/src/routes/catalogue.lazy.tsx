import { createLazyFileRoute } from "@tanstack/react-router";
import { CatalogueManager } from "@/components/catalogue/CatalogueManager";
import { logger } from "@academic-explorer/utils/logger";

function CataloguePage() {
  logger.debug("catalogue", "Catalogue page rendering");

  return (
    <div data-testid="catalogue-manager">
      <CatalogueManager />
    </div>
  );
}

export const Route = createLazyFileRoute("/catalogue")({
  component: CataloguePage,
});

export default CataloguePage;