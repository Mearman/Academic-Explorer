import { createLazyFileRoute } from "@tanstack/react-router";
import { CatalogueManager } from "@/components/catalogue/CatalogueManager";
import { useNavigate } from "@tanstack/react-router";

function CataloguePage() {
  const navigate = useNavigate();

  const handleNavigate = (url: string) => {
    // Handle navigation to catalogue URLs and entity URLs
    if (url.startsWith("/")) {
      // For hash-based routing, directly update the hash
      window.location.hash = url;
    } else if (url.startsWith("https://api.openalex.org")) {
      // Convert API URL to internal path for navigation
      const internalPath = url.replace("https://api.openalex.org", "");
      window.location.hash = internalPath;
    } else {
      // Use window.location for external URLs
      window.location.href = url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <CatalogueManager onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/catalogue")({
  component: CataloguePage,
});

export default CataloguePage;