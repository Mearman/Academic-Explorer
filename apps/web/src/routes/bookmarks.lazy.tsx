import { createLazyFileRoute } from "@tanstack/react-router";
import { BookmarkManager } from "@/components/BookmarkManager";

import { useNavigate } from "@tanstack/react-router";

function BookmarksPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <BookmarkManager
          onNavigate={(url) => {
            // Handle navigation to bookmarked URLs
            if (url.startsWith("/")) {
              // For hash-based routing, directly update the hash
              // This is more reliable than using TanStack Router's navigate in this context
              window.location.hash = url;
            } else if (url.startsWith("https://api.openalex.org")) {
              // Convert API URL to internal path for navigation
              const internalPath = url.replace("https://api.openalex.org", "");
              window.location.hash = internalPath;
            } else {
              // Use window.location for external URLs
              window.location.href = url;
            }
          }}
        />
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/bookmarks")({
  component: BookmarksPage,
});

export default BookmarksPage;
